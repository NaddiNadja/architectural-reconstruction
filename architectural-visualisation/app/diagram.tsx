"use client";
import React from "react";
import dataTransform, {
  Data,
  DrawableBox,
  DrawableLine,
} from "./dataVisualisation";

const Diagram = ({ data }: { data: Data }) => {
  const [boxes, setBoxes] = React.useState<DrawableBox[]>([]);
  const [lines, setLines] = React.useState<DrawableLine[]>([]);

  React.useEffect(() => {
    const { boxes, lines } = dataTransform(data);
    setBoxes(boxes);
    setLines(lines);
  }, [data]);

  const filterDataByFilename = (prefix: string) => {
    if (prefix === "") {
      const { boxes, lines } = dataTransform(data);
      setBoxes(boxes);
      setLines(lines);
      return;
    }

    const newData: Data = {
      frontend: {
        files: new Map(),
        api_calls: new Map(),
      },
      backend: {
        files: new Map(),
        modules: new Map(),
        endpoint_imports: new Map(),
      },
    };
    for (const [filename, methodCalls] of data.frontend.files) {
      if (filename.startsWith(prefix)) {
        newData.frontend.files.set(filename, methodCalls);
        for (const methodCall of methodCalls) {
          const api_call = data.frontend.api_calls.get(methodCall);
          if (api_call) {
            newData.frontend.api_calls.set(methodCall, api_call);
            const backendFile = [...data.backend.files.keys()].find(
              (filename) => data.backend.files.get(filename)!.includes(api_call)
            );
            if (backendFile) {
              if (!newData.backend.files.has(backendFile)) {
                newData.backend.files.set(backendFile, []);
              }
              if (!newData.backend.files.get(backendFile)!.includes(api_call))
                newData.backend.files.get(backendFile)!.push(api_call);

              const imports = data.backend.endpoint_imports.get(api_call);
              if (imports) {
                for (const [frm, module] of imports) {
                  if (!newData.backend.modules.has(frm)) {
                    newData.backend.modules.set(frm, []);
                  }
                  if (!newData.backend.modules.get(frm)!.includes(module))
                    newData.backend.modules.get(frm)!.push(module);

                  if (!newData.backend.endpoint_imports.has(api_call)) {
                    newData.backend.endpoint_imports.set(api_call, []);
                  }
                  if (
                    !newData.backend.endpoint_imports
                      .get(api_call)!
                      .includes([frm, module])
                  ) {
                    newData.backend.endpoint_imports
                      .get(api_call)!
                      .push([frm, module]);
                  }
                }
              }
            }
          }
        }
      }
    }
    const { boxes, lines } = dataTransform(newData);
    setBoxes(boxes);
    setLines(lines);
  };

  return (
    <svg viewBox="-50 -60 2000 10000" width="2000px" height="10000px">
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="10"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#000"></path>
        </marker>
      </defs>
      <g>
        <rect
          onClick={() => filterDataByFilename("")}
          width="100px"
          height="30px"
          x="-20"
          y="-60"
          className="clickable"
        />
        <text
          onClick={() => filterDataByFilename("")}
          x="-10"
          y="-40"
          style={{ cursor: "pointer" }}
          className="clickable"
        >
          Reset
        </text>
      </g>
      {boxes.map((element, i) => (
        <g key={element.title + i}>
          <rect
            onClick={
              element.clickable
                ? () =>
                    filterDataByFilename((element.prefix ?? "") + element.title)
                : undefined
            }
            width={element.position.w}
            height={element.position.h}
            x={element.position.x}
            y={element.position.y}
            z={element.position.x}
            className={element.clickable ? "clickable" : undefined}
          />
          <text
            onClick={
              element.clickable
                ? () =>
                    filterDataByFilename((element.prefix ?? "") + element.title)
                : undefined
            }
            style={{ cursor: element.clickable ? "pointer" : "default" }}
            x={element.position.x + 10}
            y={element.position.y + 20}
            className={element.clickable ? "clickable" : undefined}
          >
            {element.title}
          </text>
        </g>
      ))}
      {lines.map((line, i) => (
        <line
          key={i}
          marker-end="url(#arrow)"
          x1={line.from.x}
          y1={line.from.y}
          x2={line.to.x}
          y2={line.to.y}
        />
      ))}
    </svg>
  );
};

export default Diagram;
