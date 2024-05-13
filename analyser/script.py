import os, re, json
from collections import defaultdict

fe_dir = "C:/Users/nadja/Documents/Work/zeeguu-web"
be_dir = "C:/Users/nadja/Documents/Work/zeeguu-api"

def analyse_endpoints():
  endpoint_dir = f"{be_dir}/zeeguu/api/endpoints"
  endpoint_module = "zeeguu.api.endpoints"
  import_regex = r"^from ((zeeguu)?\..*) import (([a-zA-Z_]+(, ?)?)+|\((\n\s+.+)+\n\))$"

  def get_imports(content: str, cur_dir: str):
    matches = re.findall(import_regex, content, re.MULTILINE)
    imports = []
    for i in matches:
      frm = i[0]
      if frm.startswith("..."):
        frm = ".".join((endpoint_module + cur_dir.replace("\\", ".")).split(".")[:-2]) + frm[2:]
      elif frm.startswith(".."):
        frm = ".".join((endpoint_module + cur_dir.replace("\\", ".")).split(".")[:-1]) + frm[1:]
      elif frm.startswith("."):
        frm = endpoint_module + cur_dir.replace("\\", ".") + frm
      if frm.endswith("."): frm = frm[:-1]
      imprt = i[2]
      if imprt.startswith("("):
        imprt = imprt[1:-1].strip().replace(" ", "").replace(",\n", ",")
      imprt = imprt.split(",")
      imprt = [(frm, x.strip()) for x in imprt if len(x) > 0]
      imports += imprt
    return imports

  def get_endpoints(content: str):
    routes = re.split(r"@api.route\(\s*\"", content)[1:]
    endpoints = []
    for route in routes:
      endpoint = route[:route.index("\"")]
      endpoint = re.sub(r"<.*?>", "VAR", endpoint)
      if "def" not in route:
        continue 
      method = route[route.index("def"):]
      endpoints.append((endpoint, method))
    return endpoints

  def find_imports(imports, endpoints):
    endpoint_imports = {}
    for endpoint, method in endpoints:
      used_imports = []
      for frm, imprt in imports:
        if imprt in method:
          used_imports.append((frm, imprt))
      endpoint_imports[endpoint] = used_imports
    return endpoint_imports

  endpoint_imports = {}
  file_to_endpoints = defaultdict(list)
  endpoint_to_file = {}

  for path, _, filenames in os.walk(endpoint_dir):
    for filename in filenames:
      if filename.startswith("_"): continue
      with open(f"{path}/{filename}", encoding="utf8") as f:
        content = f.read()
        imports = get_imports(content, path[len(endpoint_dir):])
        endpoints = get_endpoints(content)
        file_to_endpoints[filename] = [endpoint[0] for endpoint in endpoints]
        for endpoint in endpoints:
          endpoint_to_file[endpoint[0]] = filename
        endpoint_imports |= find_imports(imports, endpoints)
  
  return endpoint_imports, file_to_endpoints, endpoint_to_file

def analyse_frontend():
  src_dir = f"{fe_dir}/src"
  api_dir = f"{src_dir}/api"
  zeeguu_api_classdef = f"{api_dir}/classDef.js"
  with open(zeeguu_api_classdef, encoding="utf8") as f:
    content = f.read()
    class_methods = re.findall(r" ([a-zA-Z_]+)\(endpoint", content)
  
  def get_methods(content: str):
    """Extracts all Zeeguu_API.prototype methods from the frontend api."""
    methods = re.split(r"Zeeguu_API\.prototype\.", content)[1:]
    endpoints = []
    for method in methods:
      if " = function" not in method: continue
      methodname = method[:method.index(" = function")].strip()
      method = method[method.index("function"):]
      endpoints.append((methodname, method))
    return endpoints
  
  def find_endpoints_in_methods(prototype_methods):
    """Checks which Zeeguu_API.prototype methods use which backend endpoints."""
    method_endpoints = {}

    reg_methods = f'{"|".join(class_methods+["fetch"])}'
    regex = (r'(url = (this[.]baseAPIurl [+] )?[`"](.*?)[`"](\s|.)*?(' +
             reg_methods +
             r")[(]\s*url)|((" +
             reg_methods + 
             r')[(]\s*[`"](.*?)[`"])')
    pattern = re.compile(regex)

    for methodname, method in prototype_methods:
      matches = pattern.findall(method)
      for match in matches:
        endpoint = ""
        if match[2] != "":
          endpoint = match[2]
        elif match[7] != "":
          endpoint = match[7]
        if endpoint != "":
          endpoint = re.sub(r"\$\{.*?\}", "VAR", endpoint)
          endpoint = endpoint.replace("with_context", "VAR")
          endpoint = endpoint.split("?")[0]
          if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
          method_endpoints[methodname] = endpoint
    return method_endpoints
  
  method_endpoints = {"logReaderActivity": "/upload_user_activity_data"}

  for filename in os.listdir(api_dir):
    if filename in ["classDef.js", "Zeeguu_API.js"]: continue
    if not os.path.isfile(f"{api_dir}/{filename}"): continue
    with open(f"{api_dir}/{filename}", encoding="utf8") as f:
      content = f.read()
      content = re.sub(r"\/\*(\s|.)*?\*\/", "", content) # remove comments
      prototype_methods = get_methods(content)
      method_endpoints |= find_endpoints_in_methods(prototype_methods)

  filename_methods = defaultdict(list)
  for path, _, filenames in os.walk(src_dir):
    if path == api_dir: continue
    for filename in filenames:
      if not filename.endswith(".js"): continue
      with open(f"{path}/{filename}", encoding="utf8") as f:
        content = f.read()
        content = re.sub(r"\/\*(\s|.)*?\*\/", "", content) # remove comments
        for prototype_method in method_endpoints:
          if f".{prototype_method}(" in content:
            p = f"{path}/{filename}"[len(src_dir):].replace("\\", "/")
            filename_methods[p].append(prototype_method)
  return filename_methods, method_endpoints


endpoint_imports, endpoint_files, endpoint_to_file = analyse_endpoints()
filename_methods, method_endpoints = analyse_frontend()

filename_to_number_of_calls = defaultdict(int)
endpoint_to_number_of_calls = defaultdict(int)

for filename, prototype_methods in filename_methods.items():
  unique_endpoints = set()
  for prototype_method in prototype_methods:
    endpoint = method_endpoints[prototype_method]
    if endpoint not in endpoint_imports:
      continue
    else:
      fn = endpoint_to_file[endpoint]
      unique_endpoints.add(fn)
      filename_to_number_of_calls[fn] += 1
      endpoint_to_number_of_calls[endpoint] += 1

unique_imports = defaultdict(set)
for endpoint, imports in endpoint_imports.items():
  for frm, imprt in imports:
    unique_imports[frm].add(imprt)

# print()
# print()
# print("=== backend filenames and number of calls to each ===")

# sorted_files = sorted(filename_to_number_of_calls.items(), key=lambda x: x[1], reverse=True)

# for filename, calls in sorted_files:
#   print(f"{filename}: {calls}")

  
# print()
# print()
# print("=== backend endpoints and number of calls to each ===")

# sorted_endpoints = sorted(endpoint_to_number_of_calls.items(), key=lambda x: x[1], reverse=True)

# for endpoint, calls in sorted_endpoints:
#   print(f"{endpoint}: {calls}")

modules = {}
for frm, imports in unique_imports.items():
  modules[frm] = []
  for imprt in imports:
    modules[frm].append(imprt)

data = {
  "frontend": {
    "files": filename_methods,
    "api_calls": method_endpoints
  },
  "backend": {
    "files": endpoint_files,
    "modules": modules,
    "endpoint_imports": endpoint_imports
  }
}

out = json.dumps(data, indent=2, ensure_ascii=False)
print(out)