import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";
import { topologicalSort } from "./algorithms";

const rootDir = path.join(__dirname, "..", "test-fixture");
const graph = buildDependencyGraph(rootDir);

const order = topologicalSort(graph);
console.log("Build order:");
for (const stage of order) {
  console.log(" ", stage.map(id => path.basename(id)));
}