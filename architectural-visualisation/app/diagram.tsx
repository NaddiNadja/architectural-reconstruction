"use client";
import React from "react";
import dataTransform, {
  Data,
  ReverseData,
  DrawableBox,
  DrawableLine,
} from "./dataVisualisation";
import useFiltering from "./filtering";

interface Props {
  data: Data;
  reverseData: ReverseData;
}

const Diagram = ({ data, reverseData }: Props) => {
  const [boxes, setBoxes] = React.useState<DrawableBox[]>([]);
  const [lines, setLines] = React.useState<DrawableLine[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [mergeBackendModules, setMergeBackendModules] = React.useState(false);
  const {
    filterByFilenamePrefix,
    filterByMethodPrefix,
    filterByBeFilePrefix,
    filterByEndpointPrefix,
    filterByModulePrefix,
    filterByObjPrefix,
  } = useFiltering(data, reverseData);

  React.useEffect(() => {
    const { boxes, lines } = dataTransform(data, reverseData);
    setBoxes(boxes);
    setLines(lines);
  }, [data]);

  const filterData = (prefix: string, type?: string) => {
    setSelected(prefix);
    if (prefix === "") {
      const { boxes, lines } = dataTransform(
        data,
        reverseData,
        mergeBackendModules
      );
      setBoxes(boxes);
      setLines(lines);
      return;
    }
    let newData: Data = {
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
    window.scrollTo(0, 0);

    const types = [
      "fePackage",
      "feMethod",
      "beFile",
      "beEndpoint",
      "beModule",
      "beObj",
    ];
    const methods = [
      filterByFilenamePrefix,
      filterByMethodPrefix,
      filterByBeFilePrefix,
      filterByEndpointPrefix,
      filterByModulePrefix,
      filterByObjPrefix,
    ];

    newData = methods[types.indexOf(type || "")](prefix, newData);

    const { boxes, lines } = dataTransform(
      newData,
      reverseData,
      mergeBackendModules
    );
    setBoxes(boxes);
    setLines(lines);
  };

  React.useEffect(() => {
    filterData("");
  }, [mergeBackendModules]);

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
          onClick={e => filterData("")}
          width="100px"
          height="30px"
          x="-20"
          y="-60"
          className="clickable"
        />
        <text x="-10" y="-40">
          Reset
        </text>
        <rect
          onClick={e => setMergeBackendModules(prev => !prev)}
          width="200px"
          height="30px"
          x="100"
          y="-60"
          className={`clickable ${mergeBackendModules ? "selected" : ""}`}
        />
        <text x="110" y="-40">
          Merge backend modules
        </text>
      </g>
      {boxes.map((element, i) => (
        <g key={element.title + i}>
          <rect
            onClick={
              element.type !== "container"
                ? e =>
                    filterData(
                      (element.prefix ?? "") + element.title,
                      element.type
                    )
                : undefined
            }
            width={element.position.w}
            height={element.position.h}
            x={element.position.x}
            y={element.position.y}
            z={element.position.x}
            className={
              element.type !== "container"
                ? `clickable ${
                    (element.prefix ?? "") + element.title === selected
                      ? "selected"
                      : ""
                  }`
                : undefined
            }
          />
          <rect
            width={element.position.w}
            height={element.position.h}
            x={element.position.x}
            y={element.position.y}
            style={{
              opacity: (1 / 20) * element.dependencies,
            }}
            className="shade"
          />
          <text x={element.position.x + 10} y={element.position.y + 20}>
            {element.title}{" "}
          </text>
          {element.dependencies > 0 && (
            <text
              x={element.position.x + element.position.w - 10}
              y={element.position.y + 19}
              textAnchor="end"
              style={{ fontSize: "10px" }}
            >
              ({element.dependencies})
            </text>
          )}
        </g>
      ))}
      {lines.map((line, i) => (
        <line
          key={i}
          markerEnd="url(#arrow)"
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
