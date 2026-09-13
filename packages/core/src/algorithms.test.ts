import { describe, it, expect } from "vitest";
import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";
import { findStronglyConnectedComponents } from "./algorithms";
import { topologicalSort } from "./algorithms";

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

describe("findStronglyConnectedComponents", () => {
  const rootDir = path.join(__dirname, "..", "test-fixture");
  const graph = buildDependencyGraph(rootDir);

  it("groups cyclicA and cyclicB together, and leaves non-cyclic files as singletons", () => {
    const sccs = findStronglyConnectedComponents(graph);

    // Convert each SCC (array of ids) into a sorted array of just filenames,
    // so we can compare cleanly regardless of path/order differences.
    const sccNames = sccs
      .map(scc => scc.map(id => path.basename(id)).sort())
      .sort((a, b) => a.join(",").localeCompare(b.join(",")));

    expect(sccNames).toEqual([
      ["app.ts"],
      ["constants.ts"],
      ["cyclicA.ts", "cyclicB.ts"],
      ["math.ts"],
    ]);
  });
});


describe("topologicalSort", () => {
  const rootDir = path.join(__dirname, "..", "test-fixture");
  const graph = buildDependencyGraph(rootDir);

  it("orders constants before math before app, respecting dependencies", () => {
    const order = topologicalSort(graph);
    const flatNames = order.map(stage => stage.map(id => path.basename(id)));

    const indexOfStageContaining = (name: string) =>
      flatNames.findIndex(stage => stage.includes(name));

    const constantsPos = indexOfStageContaining("constants.ts");
    const mathPos = indexOfStageContaining("math.ts");
    const appPos = indexOfStageContaining("app.ts");

    expect(constantsPos).toBeLessThan(mathPos);
    expect(mathPos).toBeLessThan(appPos);
  });

  it("keeps cyclicA and cyclicB together in the same stage", () => {
    const order = topologicalSort(graph);
    const cyclicStage = order.find(stage =>
      stage.some(id => id.endsWith("cyclicA.ts"))
    )!;
    const names = cyclicStage.map(id => path.basename(id)).sort();

    expect(names).toEqual(["cyclicA.ts", "cyclicB.ts"]);
  });
});