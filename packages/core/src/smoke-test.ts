import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";
import { topologicalSort } from "./algorithms";
import { findDeadCode } from "./algorithms";

const rootDir = path.join(__dirname, "..", "test-fixture");
const graph = buildDependencyGraph(rootDir);

const deadCode = findDeadCode(graph);
console.log("Dead code:", deadCode.map(id => path.basename(id)));