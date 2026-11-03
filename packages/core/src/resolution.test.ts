import { describe, it, expect } from "vitest";
import * as path from "path";
import { buildDependencyGraph } from "./parser";
import { blastRadius, findStronglyConnectedComponents } from "./algorithms";

const fixture = (name: string) => path.join(__dirname, "..", name);
const names = (ids: string[]) => ids.map((id) => path.basename(id)).sort();
const edgeNames = (graph: ReturnType<typeof buildDependencyGraph>) =>
  graph.edges.map((e) => `${path.basename(e.from)}->${path.basename(e.to)}`).sort();

describe("type-only imports", () => {
  const graph = buildDependencyGraph(fixture("test-fixture-typeonly"));
  const id = (file: string) => [...graph.nodes.keys()].find((n) => n.endsWith(`/${file}`))!;

  it("flags import type, inline type imports, and keeps mixed imports as runtime", () => {
    const flags = Object.fromEntries(
      graph.edges.map((e) => [`${path.basename(e.from)}->${path.basename(e.to)}:${e.specifier}`, !!e.typeOnly])
    );

    expect(flags["a.ts->b.ts:./b"]).toBe(true); // import type { B }
    expect(flags["b.ts->a.ts:./a"]).toBe(true); // import { type A }
    // mixed1 has one type import and one value import from mixed2
    const mixed = graph.edges.filter((e) => path.basename(e.from) === "mixed1.ts");
    expect(mixed.map((e) => !!e.typeOnly).sort()).toEqual([false, true]);
  });

  it("does not report a cycle that only exists through type imports", () => {
    const groups = findStronglyConnectedComponents(graph)
      .filter((scc) => scc.length > 1)
      .map(names);

    // a.ts <-> b.ts is type-only (no runtime cycle); mixed1 <-> mixed2 is a real one
    expect(groups).toEqual([["mixed1.ts", "mixed2.ts"]]);
  });

  it("still counts type imports in blast radius", () => {
    expect(names(blastRadius(graph, id("a.ts")))).toEqual(["b.ts"]);
  });
});

describe("tsconfig aliases", () => {
  it("resolves paths and baseUrl imports, and leaves external packages out", () => {
    const graph = buildDependencyGraph(fixture("test-fixture-alias"));

    expect(edgeNames(graph)).toEqual(["main.ts->helper.ts", "main.ts->thing.ts"]);
    expect(graph.unresolved).toEqual([]); // "lodash" is external, not unresolved
  });

  it("finds aliases defined in a referenced tsconfig (solution-style)", () => {
    const graph = buildDependencyGraph(fixture("test-fixture-refs"));

    expect(edgeNames(graph)).toEqual(["main.ts->lib.ts"]);
  });
});

describe("workspace packages", () => {
  it("resolves imports by package name to the package's source", () => {
    const graph = buildDependencyGraph(fixture("test-fixture-workspace"));

    // "@acme/core" -> main points at dist/index.js, so we map it to src/index.ts
    // "@acme/core/util" -> src/util.ts
    expect(edgeNames(graph)).toEqual(["main.ts->index.ts", "main.ts->util.ts"]);
  });
});
