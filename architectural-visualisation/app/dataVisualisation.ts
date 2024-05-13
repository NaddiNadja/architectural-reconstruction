import { arr } from "./util";

const FE_FILE_X = 0;
const FE_FILE_Y = 0; // 900;
const METHOD_X = FE_FILE_X + 500;
const METHOD_Y = 60; //800;
const METHOD_W = 290;
const BE_FILE_X = 930;
const BE_FILE_Y = 60;
const MODULE_X = BE_FILE_X + 450;
const MODULE_Y = 60; // 300;
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
};

export type DrawableLine = {
  from: Coord;
  to: Coord;
};

type FrontendPackage = Map<string, FrontendPackage>;

const dataTransform = (
  data: Data
): { boxes: DrawableBox[]; lines: DrawableLine[] } => {
  console.log(data);
  const drawableToPos: Map<string, DrawableBox> = new Map();

  const fePackages: FrontendPackage = new Map();
  const feFiles: DrawableBox[] = [];
  const methodCalls: string[] = [];

  for (const [filename, methods] of arr(data.frontend.files)) {
    const parts = filename.split("/");
    let cur = fePackages;
    for (let i = 1; i < parts.length; i++) {
      if (!cur.has(parts[i])) {
        cur.set(parts[i], new Map());
      }
      cur = cur.get(parts[i])!;
    }
    for (const method of methods) {
      methodCalls.push(method);
    }
  }

  const buildRecursively = (
    cur: FrontendPackage,
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
    };
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

  // filter the methods to only include each method once
  const uniqueMethods = methodCalls.filter(
    (method, index, self) => self.indexOf(method) === index
  );

  const zeeguuApiMethods = [];
  let top = METHOD_Y + 60;
  for (const methodName of uniqueMethods) {
    const method: DrawableBox = {
      title: methodName + "()",
      position: { x: METHOD_X + 20, y: top, h: 30, w: METHOD_W - 2 * 20 },
      type: "feMethod",
    };
    drawableToPos.set(methodName, method);
    top += 40;
    zeeguuApiMethods.push(method);
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
  };
  feContainer.position.h = Math.max(
    feContainer.position.h,
    zeeguuApiContainer.position.h + 50 + METHOD_Y
  );

  const endpointToBeFile = new Map<string, string>();
  const beFiles = [];
  const endpoints = [];
  top = BE_FILE_Y + 60;
  for (const [filename, eps] of arr(data.backend.files)) {
    const beFile: DrawableBox = {
      title: filename,
      position: { x: BE_FILE_X + 20, y: top, h: eps.length * 40 + 50, w: 340 },
      type: "beFile",
    };
    drawableToPos.set(filename, beFile);
    top += 40;
    for (const ep of eps) {
      const endpoint: DrawableBox = {
        title: ep,
        position: { x: beFile.position.x + 20, y: top, h: 30, w: 300 },
        type: "beEndpoint",
      };
      endpointToBeFile.set(ep, filename);
      drawableToPos.set(ep, endpoint);
      endpoints.push(endpoint);
      top += 40;
    }
    top += 30;
    beFiles.push(beFile);
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
  };

  const modules = [];
  const objects = [];
  top = MODULE_Y;
  for (const [path, objs] of arr(data.backend.modules)) {
    const beModule: DrawableBox = {
      title: path,
      position: {
        x: MODULE_X + 20,
        y: top,
        h: objs.length * 40 + 50,
        w: MODULE_W - 2 * 20,
      },
      type: "beModule",
    };
    drawableToPos.set(path, beModule);
    top += 40;
    for (const obj of objs) {
      const object: DrawableBox = {
        title: obj,
        position: {
          x: beModule.position.x + 20,
          y: top,
          h: 30,
          w: beModule.position.w - 40,
        },
        prefix: path + ".",
        type: "beObj",
      };
      drawableToPos.set(obj, object);
      objects.push(object);
      top += 40;
    }
    top += 30;
    modules.push(beModule);
  }
  const moduleContainer: DrawableBox = {
    title: "Server modules (invisible)",
    position: {
      x: MODULE_X,
      y: MODULE_Y,
      h: top - MODULE_Y,
      w: MODULE_W,
    },
    type: "container",
  };

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
      console.log("Method not found", filename);
      continue;
    }
    for (const method of methods) {
      const to = drawableToPos.get(method);
      if (!to) {
        continue;
      }
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
    lines.push({ from: getFromPos(from), to: getToPos(to) });
  }
  for (const [endpoint, imports] of arr(data.backend.endpoint_imports)) {
    const from = drawableToPos.get(endpoint);
    if (!from) {
      continue;
    }
    for (const [_, imported] of imports) {
      const to = drawableToPos.get(imported);
      if (!to) {
        continue;
      }
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
      ...objects,
    ],
    lines,
  };
};

export default dataTransform;
