import { describe, it, expect } from "vitest";
import { buildDependencyGraph } from "./parser";
import { blastRadius } from "./algorithms";
import * as path from "path";
import { findStronglyConnectedComponents } from "./algorithms";

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