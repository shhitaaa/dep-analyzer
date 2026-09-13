import { describe, it, expect } from "vitest";
import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";

describe("blastRadius", () => {
  const rootDir = path.join(__dirname, "..", "test-fixture");
  const graph = buildDependencyGraph(rootDir);

  it("finds all files that transitively depend on constants.ts", () => {
    const constantsId = [...graph.nodes.keys()].find(id => id.endsWith("constants.ts"))!;
    const radius = blastRadius(graph, constantsId);
    const names = radius.map(id => path.basename(id)).sort();

    expect(names).toEqual(["app.ts", "math.ts"]);
  });

  it("terminates and returns correctly for a circular dependency", () => {
    const cyclicAId = [...graph.nodes.keys()].find(id => id.endsWith("cyclicA.ts"))!;
    const radius = blastRadius(graph, cyclicAId);
    const names = radius.map(id => path.basename(id));

    expect(names).toEqual(["cyclicB.ts"]);
  });
});