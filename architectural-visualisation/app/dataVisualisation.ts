import { arr } from "./util";

const FE_FILE_X = 0;
const FE_FILE_Y = 0; // 900;
const METHOD_X = FE_FILE_X + 500;
const METHOD_Y = 60; //800;
const METHOD_W = 290;
const BE_FILE_X = 930;
const BE_FILE_Y = 60;
const MODULE_X = BE_FILE_X + 450;
const MODULE_Y = 20; // 300;
const MODULE_W = 400; // 300;

export type Data = {
  frontend: {
    files: Map<string, string[]>;
    api_calls: Map<string, string>;
  };
  backend: {
    files: Map<string, string[]>;
    modules: Map<string, string[]>;
    endpoint_imports: Map<string, string[][]>;
  };
};
export type ReverseData = {
  frontend: {
    methodToFiles: Map<string, string[]>;
    apiCallToMethod: Map<string, string[]>;
  };
  backend: {
    endpointToFiles: Map<string, string[]>;
    objToEndpoint: Map<string, string[]>;
    objToModule: Map<string, string>;
  };
};

type Coord = {
  x: number;
  y: number;
};

export type DrawableBox = {
  prefix?: string;
  title: string;
  position: Coord & {
    h: number;
    w: number;
  };
  clickable?: boolean;
  type:
    | "container"
    | "fePackage"
    | "feMethod"
    | "beFile"
    | "beEndpoint"
    | "beModule"
    | "beObj";
  dependencies: number;
  parent?: DrawableBox;
};

export type DrawableLine = {
  from: Coord;
  to: Coord;
};

type Package = Map<string, Package>;

const dataTransform = (
  data: Data,
  reverseData: ReverseData,
  mergeModules = true
): { boxes: DrawableBox[]; lines: DrawableLine[] } => {
  console.log("Transforming data to visualisable:", data);
  const drawableToPos: Map<string, DrawableBox> = new Map();

  const fePackages: Package = new Map();
  const feFiles: DrawableBox[] = [];

  for (const [filename, _] of arr(data.frontend.files)) {
    const parts = filename.split("/");
    let cur = fePackages;
    for (let i = 1; i < parts.length; i++) {
      if (!cur.has(parts[i])) {
        cur.set(parts[i], new Map());
      }
      cur = cur.get(parts[i])!;
    }
  }

  const buildRecursively = (
    cur: Package,
    x: number,
    y: number,
    prefix: string,
    title: string
  ): DrawableBox => {
    let height = 30;
    const children = [];
    for (const [pkg, _] of arr(cur)) {
      const sub = buildRecursively(
        cur.get(pkg)!,
        x + 20,
        y + height + 10,
        prefix + title + "/",
        pkg
      );
      children.push(sub);
      height += sub.position.h + 10;
      if (prefix === "") height += 10;
    }
    if (children.length > 0) height += 20;
    const box: DrawableBox = {
      title,
      prefix,
      position: { x, y, h: height, w: 400 - x * 2 },
      clickable: true,
      type: "fePackage",
      dependencies: 0,
    };
    children.forEach(child => (child.parent = box));
    drawableToPos.set(prefix + title, box);
    feFiles.push(box);
    return box;
  };

  const feContainer = buildRecursively(
    fePackages,
    FE_FILE_X,
    FE_FILE_Y + 30,
    "",
    ""
  );
  feContainer.title = "React web client";
  feContainer.clickable = false;
  feContainer.position.x = FE_FILE_X - 20;
  feContainer.position.y = FE_FILE_Y;
  feContainer.position.h += 70;
  feContainer.position.w = METHOD_X + METHOD_W + 60;
  feContainer.type = "container";

  feFiles.reverse();

  const beFiles = [];
  const endpoints = [];
  let top = BE_FILE_Y + 60;
  for (const [filename, eps] of arr(data.backend.files)) {
    const beFile: DrawableBox = {
      title: filename,
      position: { x: BE_FILE_X + 20, y: top, h: eps.length * 40 + 50, w: 340 },
      type: "beFile",
      dependencies: 0,
    };
    top += 40;
    let found = false;
    for (const ep of eps) {
      if (!reverseData.frontend.apiCallToMethod.has(ep)) continue;
      found = true;
      const endpoint: DrawableBox = {
        title: ep,
        position: { x: beFile.position.x + 20, y: top, h: 30, w: 300 },
        type: "beEndpoint",
        dependencies: 0,
        parent: beFile,
      };
      drawableToPos.set(ep, endpoint);
      endpoints.push(endpoint);
      top += 40;
    }
    beFile.position.h = top - beFile.position.y + 10;
    if (found) {
      top += 30;
      drawableToPos.set(filename, beFile);
      beFiles.push(beFile);
    } else {
      top -= 40;
    }
  }
  const beContainer: DrawableBox = {
    title: "zeeguu.api.endpoints",
    position: {
      x: BE_FILE_X,
      y: BE_FILE_Y,
      h: top - BE_FILE_Y + 10,
      w: 380,
    },
    type: "container",
    dependencies: 0,
  };

  const zeeguuApiMethods = [];
  top = METHOD_Y + 60;
  for (const endpointBox of endpoints) {
    const methodNames = reverseData.frontend.apiCallToMethod.get(
      endpointBox.title
    );
    if (!methodNames) continue;
    for (const methodName of methodNames) {
      if (!data.frontend.api_calls.has(methodName)) continue;
      const method: DrawableBox = {
        title: methodName + "()",
        position: { x: METHOD_X + 20, y: top, h: 30, w: METHOD_W - 2 * 20 },
        type: "feMethod",
        dependencies: 0,
      };
      drawableToPos.set(methodName, method);
      top += 40;
      zeeguuApiMethods.push(method);
    }
  }
  const zeeguuApiContainer: DrawableBox = {
    title: "«object» Zeeguu_API.prototype",
    position: {
      x: METHOD_X,
      y: METHOD_Y,
      h: top - METHOD_Y + 10,
      w: METHOD_W,
    },
    type: "container",
    dependencies: 0,
  };
  feContainer.position.h = Math.max(
    feContainer.position.h,
    zeeguuApiContainer.position.h + 50 + METHOD_Y
  );

  const modules: DrawableBox[] = [];
  top = MODULE_Y;

  const beModulePackages: Package = new Map();

  for (const [path, objs] of arr(data.backend.modules)) {
    const parts = path.split(".");
    let cur = beModulePackages;
    for (let i = 0; i < parts.length; i++) {
      if (!cur.has(parts[i])) {
        cur.set(parts[i], new Map());
      }
      cur = cur.get(parts[i])!;
    }
    for (const obj of objs) {
      if (!cur.has(obj)) {
        cur.set(obj, new Map());
      }
    }
  }

  const buildRecursivelyModules = (
    cur: Package,
    x: number,
    y: number,
    prefix: string,
    title: string
  ): DrawableBox => {
    let height = 30;
    const children = [];
    for (const [pkg, next] of arr(cur)) {
      const sub = buildRecursivelyModules(
        next,
        x + 20,
        y + height + 10,
        prefix + title + ".",
        pkg
      );
      children.push(sub);
      height += sub.position.h + (sub.position.h ? 10 : 0);
      if (prefix === "") height += 10;
    }
    if (children.length > 0) height += 20;
    const box: DrawableBox = {
      title,
      prefix,
      position: { x, y, h: height, w: MODULE_W - (x - MODULE_X) * 2 },
      clickable: true,
      type: children.length === 0 && !mergeModules ? "beObj" : "beModule",
      dependencies: 0,
    };
    children.forEach(child => (child.parent = box));
    drawableToPos.set("zeeguu" + prefix + title, box);
    if (!mergeModules || children.length > 0) modules.push(box);
    if (children.length === 0 && mergeModules) box.position.h = 0;
    return box;
  };
  const moduleContainer = buildRecursivelyModules(
    beModulePackages.get("zeeguu") || beModulePackages,
    MODULE_X,
    MODULE_Y,
    "",
    ""
  );
  modules.pop();
  moduleContainer.type = "container";
  modules.reverse();

  const backendContainer: DrawableBox = {
    title: "Python backend",
    position: {
      x: BE_FILE_X - 40,
      y: 0,
      h: Math.max(
        beContainer.position.h + 110,
        moduleContainer.position.h + 110
      ),
      w: 910,
    },
    type: "container",
    dependencies: 0,
  };

  const getFromPos = (box: DrawableBox) => {
    return {
      x: box.position.x + box.position.w,
      y: box.position.y + box.position.h / 2,
    };
  };
  const getToPos = (box: DrawableBox) => {
    return { x: box.position.x, y: box.position.y + box.position.h / 2 };
  };

  const lines = [];
  for (const [filename, methods] of arr(data.frontend.files)) {
    const from = drawableToPos.get(filename);
    if (!from) {
      continue;
    }
    for (const method of methods) {
      const to = drawableToPos.get(method);
      if (!to) {
        continue;
      }
      to.dependencies++;
      lines.push({ from: getFromPos(from), to: getToPos(to) });
    }
  }
  for (const [method, endpoint] of arr(data.frontend.api_calls)) {
    const from = drawableToPos.get(method);
    if (!from) {
      continue;
    }
    const to = drawableToPos.get(endpoint);
    if (!to) {
      continue;
    }
    to.dependencies += from.dependencies;
    lines.push({ from: getFromPos(from), to: getToPos(to) });
  }
  for (const [endpoint, imports] of arr(data.backend.endpoint_imports)) {
    const from = drawableToPos.get(endpoint);
    if (!from) {
      continue;
    }
    for (const [pkg, obj] of imports) {
      let to = drawableToPos.get(pkg + "." + obj);
      if (!to) {
        continue;
      }
      if (mergeModules) to = to.parent!;
      to.dependencies += from.dependencies;
      lines.push({ from: getFromPos(from), to: getToPos(to) });
    }
  }

  return {
    boxes: [
      backendContainer,
      ...feFiles,
      zeeguuApiContainer,
      ...zeeguuApiMethods,
      beContainer,
      ...beFiles,
      ...endpoints,
      ...modules,
    ],
    lines,
  };
};

export default dataTransform;
