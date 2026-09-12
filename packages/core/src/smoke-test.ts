import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";

const rootDir = path.join(__dirname, "..", "test-fixture");
const graph = buildDependencyGraph(rootDir);

const cyclicAId = [...graph.nodes.keys()].find(id => id.endsWith("cyclicA.ts"))!;
const cyclicRadius = blastRadius(graph, cyclicAId);

console.log("Blast radius of cyclicA.ts:");
console.log(cyclicRadius.map(id => path.basename(id)));