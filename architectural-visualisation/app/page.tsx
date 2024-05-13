import { promises as fs } from "fs";
import { arr } from "./util";
import { Data, ReverseData } from "./dataVisualisation";
import Diagram from "./diagram";

export default async function Page() {
  const file = await fs.readFile(process.cwd() + "/app/data.json", "utf8");
  const json = JSON.parse(file);
  const data: Data = {
    frontend: {
      files: new Map(Object.entries(json.frontend.files)),
      api_calls: new Map(Object.entries(json.frontend.api_calls)),
    },
    backend: {
      files: new Map(Object.entries(json.backend.files)),
      modules: new Map(Object.entries(json.backend.modules)),
      endpoint_imports: new Map(Object.entries(json.backend.endpoint_imports)),
    },
  };

  const calculateReverse = () => {
    const reverse: ReverseData = {
      frontend: {
        methodToFiles: new Map<string, string[]>(),
        apiCallToMethod: new Map<string, string[]>(),
      },
      backend: {
        endpointToFiles: new Map<string, string[]>(),
        objToEndpoint: new Map<string, string[]>(),
        objToModule: new Map<string, string>(),
      },
    };
    for (const [filename, methods] of arr(data.frontend.files)) {
      for (const method of methods) {
        if (!reverse.frontend.methodToFiles.has(method)) {
          reverse.frontend.methodToFiles.set(method, []);
        }
        reverse.frontend.methodToFiles.get(method)!.push(filename);
      }
    }
    for (const [method, apiCall] of arr(data.frontend.api_calls)) {
      if (!reverse.frontend.apiCallToMethod.has(apiCall)) {
        reverse.frontend.apiCallToMethod.set(apiCall, []);
      }
      reverse.frontend.apiCallToMethod.get(apiCall)!.push(method);
    }
    for (const [file, endpoints] of arr(data.backend.files)) {
      for (const endpoint of endpoints) {
        if (!reverse.backend.endpointToFiles.has(endpoint)) {
          reverse.backend.endpointToFiles.set(endpoint, []);
        }
        reverse.backend.endpointToFiles.get(endpoint)!.push(file);
      }
    }
    for (const [path, objs] of arr(data.backend.modules)) {
      for (const obj of objs) {
        reverse.backend.objToModule.set(obj, path);
      }
    }
    for (const [endpoint, imports] of arr(data.backend.endpoint_imports)) {
      for (const [pkg, imported] of imports) {
        if (!reverse.backend.objToEndpoint.has(pkg + "." + imported)) {
          reverse.backend.objToEndpoint.set(pkg + "." + imported, []);
        }
        reverse.backend.objToEndpoint.get(pkg + "." + imported)!.push(endpoint);
      }
    }
    return reverse;
  };

  const reverse = calculateReverse();

  return (
    <main>
      <Diagram data={data} reverseData={reverse} />
    </main>
  );
}
