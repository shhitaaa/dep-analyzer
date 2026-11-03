import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildDependencyGraph } from "./parser";

describe("resolveSpecifier", () => {
  it("resolves a .js specifier to the matching .ts file", () => {
    const rootDir = path.join(__dirname, "..", "test-fixture-esm");
    const graph = buildDependencyGraph(rootDir);
    const edges = graph.edges.map(
      (e) => `${path.basename(e.from)}->${path.basename(e.to)}`
    );

    expect(edges).toEqual(["a.ts->b.ts"]);
  });
});
