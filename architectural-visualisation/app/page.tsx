import { promises as fs } from "fs";
import { Data } from "./dataVisualisation";
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

  const calculateReverse = () => {};

  return (
    <main>
      <Diagram data={data} />
    </main>
  );
}
