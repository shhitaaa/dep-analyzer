import { describe, it, expect } from "vitest";
import { DependencyGraph } from "@dep-analyzer/core";
import { summarizeBlastRadius } from "./summarize";
import { MockAiProvider } from "./providers/mock-provider";

function buildTestGraph(): DependencyGraph {
  const nodes = new Map([
    ["a.ts", { id: "a.ts", relativePath: "src/a.ts" }],
    ["b.ts", { id: "b.ts", relativePath: "src/b.ts" }],
    ["c.ts", { id: "c.ts", relativePath: "src/c.ts" }],
  ]);

  const incoming = new Map([
    ["a.ts", new Set(["b.ts", "c.ts"])],
    ["b.ts", new Set<string>()],
    ["c.ts", new Set<string>()],
  ]);

  const outgoing = new Map([
    ["a.ts", new Set<string>()],
    ["b.ts", new Set(["a.ts"])],
    ["c.ts", new Set(["a.ts"])],
  ]);

  return {
    nodes,
    edges: [
      { from: "b.ts", to: "a.ts", specifier: "./a" },
      { from: "c.ts", to: "a.ts", specifier: "./a" },
    ],
    incoming,
    outgoing,
  };
}

describe("summarizeBlastRadius", () => {
  it("resolves affected ids to their relative paths before prompting", async () => {
    const graph = buildTestGraph();
    const provider = new MockAiProvider();

    const result = await summarizeBlastRadius(
      provider,
      graph,
      "a.ts",
      ["b.ts", "c.ts"]
    );

    expect(result).toContain("[MOCK RESPONSE]");
    expect(result).toContain("chars");
  });

  it("handles the case with no affected files", async () => {
    const graph = buildTestGraph();
    const provider = new MockAiProvider();

    const result = await summarizeBlastRadius(provider, graph, "b.ts", []);

    expect(result).toContain("[MOCK RESPONSE]");
  });
});