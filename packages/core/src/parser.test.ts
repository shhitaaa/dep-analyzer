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

  it("resolves directory imports (./lib and ..) to index files", () => {
    const rootDir = path.join(__dirname, "..", "test-fixture-index");
    const graph = buildDependencyGraph(rootDir);
    const edges = graph.edges
      .map((e) => `${path.basename(e.from)}->${path.basename(e.to)}`)
      .sort();

    expect(edges).toEqual(["deep.ts->index.ts", "main.ts->index.ts"]);
  });

  it("follows export ... from re-exports (barrel files)", () => {
    const rootDir = path.join(__dirname, "..", "test-fixture-exports");
    const graph = buildDependencyGraph(rootDir);
    const edges = graph.edges
      .map((e) => `${path.basename(e.from)}->${path.basename(e.to)}`)
      .sort();

    expect(edges).toEqual(["index.ts->a.ts", "index.ts->b.ts"]);
  });

  it("follows dynamic import() calls", () => {
    const rootDir = path.join(__dirname, "..", "test-fixture-dynamic");
    const graph = buildDependencyGraph(rootDir);
    const edges = graph.edges
      .map((e) => `${path.basename(e.from)}->${path.basename(e.to)}`)
      .sort();

    expect(edges).toEqual(["main.ts->lazy.ts"]);
  });

  it("follows CommonJS require() calls", () => {
    const rootDir = path.join(__dirname, "..", "test-fixture-require");
    const graph = buildDependencyGraph(rootDir);
    const edges = graph.edges
      .map((e) => `${path.basename(e.from)}->${path.basename(e.to)}`)
      .sort();

    expect(edges).toEqual(["index.js->util.js"]);
  });
});
