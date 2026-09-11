import { buildDependencyGraph } from "./parser";
import * as path from "path";

const rootDir = path.join(__dirname, "..", "test-fixture");
const graph = buildDependencyGraph(rootDir);

console.log(graph);