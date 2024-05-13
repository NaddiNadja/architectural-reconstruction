import { Data, ReverseData } from "./dataVisualisation";
import { arr } from "./util";

const useFiltering = (data: Data, reverseData: ReverseData) => {
  const filterByFilenamePrefix = (prefix: string, newData: Data) => {
    for (const [filename, methodCalls] of arr(data.frontend.files)) {
      if (filename.startsWith(prefix)) {
        newData = forwardByFilename(filename, methodCalls, newData);
      }
    }
    return newData;
  };

  const filterByMethodPrefix = (prefix: string, newData: Data) => {
    const parenthesisRemoved = prefix.replace(/\(.*\)/, "");
    for (const [method, _] of arr(data.frontend.api_calls)) {
      if (method.startsWith(parenthesisRemoved)) {
        newData = forwardByMethod(method, newData);
        newData = backwardByMethod(method, newData);
      }
    }
    return newData;
  };

  const filterByBeFilePrefix = (prefix: string, newData: Data) => {
    for (const [filename, endpoints] of arr(data.backend.files)) {
      if (filename.startsWith(prefix)) {
        for (const endpoint of endpoints) {
          newData = forwardByEndpoint(endpoint, newData);
          newData = backwardByEndpoint(endpoint, newData);
        }
      }
    }
    return newData;
  };

  const filterByEndpointPrefix = (prefix: string, newData: Data) => {
    for (const [_, endpoint] of arr(data.frontend.api_calls)) {
      if (endpoint.startsWith(prefix)) {
        newData = forwardByEndpoint(endpoint, newData);
        newData = backwardByEndpoint(endpoint, newData);
      }
    }
    return newData;
  };

  const filterByModulePrefix = (prefix: string, newData: Data) => {
    newData.backend.modules.set(prefix, data.backend.modules.get(prefix)!);

    for (const obj of data.backend.modules.get(prefix)!) {
      newData = forwardByObj(obj, newData);
      newData = backwardByObj(prefix, obj, newData);
    }
    return newData;
  };

  const filterByObjPrefix = (prefix: string, newData: Data) => {
    const frmlist = [...prefix.split(".")];
    const obj = frmlist.pop()!;
    const frm = frmlist.join(".");

    if (!newData.backend.modules.has(frm)) {
      newData.backend.modules.set(frm, []);
    }
    if (!newData.backend.modules.get(frm)!.includes(obj))
      newData.backend.modules.get(frm)!.push(obj);

    newData = forwardByObj(obj, newData);
    newData = backwardByObj(frm, obj, newData);
    return newData;
  };

  const forwardByFilename = (
    filename: string,
    methodCalls: string[],
    newData: Data
  ) => {
    newData.frontend.files.set(filename, methodCalls);
    for (const methodCall of methodCalls) {
      newData = forwardByMethod(methodCall, newData);
    }
    return newData;
  };

  const forwardByMethod = (method: string, newData: Data) => {
    const api_call = data.frontend.api_calls.get(method);
    if (api_call) {
      newData.frontend.api_calls.set(method, api_call);
      newData = forwardByEndpoint(api_call, newData);
    }
    return newData;
  };

  const forwardByEndpoint = (endpoint: string, newData: Data) => {
    const backendFile = arr(data.backend.files.keys()).find(filename =>
      data.backend.files.get(filename)!.includes(endpoint)
    );
    if (backendFile) {
      if (!newData.backend.files.has(backendFile)) {
        newData.backend.files.set(backendFile, []);
      }
      if (!newData.backend.files.get(backendFile)!.includes(endpoint))
        newData.backend.files.get(backendFile)!.push(endpoint);

      const imports = data.backend.endpoint_imports.get(endpoint);
      if (imports) {
        for (const [_, obj] of imports) {
          newData = forwardByObj(obj, newData, endpoint);
        }
      }
    }
    return newData;
  };

  const forwardByObj = (obj: string, newData: Data, api_call?: string) => {
    const frm = reverseData.backend.objToModule.get(obj)!;
    if (!newData.backend.modules.has(frm)) {
      newData.backend.modules.set(frm, []);
    }
    if (!newData.backend.modules.get(frm)!.includes(obj))
      newData.backend.modules.get(frm)!.push(obj);

    if (api_call) {
      if (!newData.backend.endpoint_imports.has(api_call)) {
        newData.backend.endpoint_imports.set(api_call, []);
      }
      if (
        !newData.backend.endpoint_imports.get(api_call)!.includes([frm, obj])
      ) {
        newData.backend.endpoint_imports.get(api_call)!.push([frm, obj]);
      }
    }

    return newData;
  };

  const backwardByMethod = (method: string, newData: Data) => {
    const filenames = reverseData.frontend.methodToFiles.get(method);
    if (!filenames) return newData;
    for (const filename of filenames) {
      if (!newData.frontend.files.has(filename)) {
        newData.frontend.files.set(filename, []);
      }
      if (!newData.frontend.files.get(filename)!.includes(method))
        newData.frontend.files.get(filename)!.push(method);
    }
    return newData;
  };

  const backwardByEndpoint = (endpoint: string, newData: Data) => {
    const methodNames = reverseData.frontend.apiCallToMethod.get(endpoint);
    if (!methodNames) return newData;
    for (const methodName of methodNames) {
      newData.frontend.api_calls.set(methodName, endpoint);
      newData = backwardByMethod(methodName, newData);
    }
    return newData;
  };

  const backwardByObj = (frm: string, obj: string, newData: Data) => {
    const endpoints = reverseData.backend.objToEndpoint.get(`${frm}.${obj}`)!;
    if (!endpoints) return newData;
    for (const endpoint of endpoints) {
      if (!newData.backend.endpoint_imports.has(endpoint)) {
        newData.backend.endpoint_imports.set(endpoint, []);
      }
      if (!newData.backend.endpoint_imports.get(endpoint)!.includes([frm, obj]))
        newData.backend.endpoint_imports.get(endpoint)!.push([frm, obj]);
      newData = backwardByEndpoint(endpoint, newData);
      const backendFile = arr(data.backend.files.keys()).find(filename =>
        data.backend.files.get(filename)!.includes(endpoint)
      );
      if (backendFile) {
        if (!newData.backend.files.has(backendFile)) {
          newData.backend.files.set(backendFile, []);
        }
        if (!newData.backend.files.get(backendFile)!.includes(endpoint))
          newData.backend.files.get(backendFile)!.push(endpoint);
      }
    }
    return newData;
  };

  return {
    filterByFilenamePrefix,
    filterByMethodPrefix,
    filterByBeFilePrefix,
    filterByEndpointPrefix,
    filterByModulePrefix,
    filterByObjPrefix,
  };
};

export default useFiltering;
