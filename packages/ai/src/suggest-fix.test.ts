import { describe, it, expect } from "vitest";
import { DependencyGraph } from "@dep-analyzer/core";
import { suggestCycleFix } from "./suggest-fix";
import { MockAiProvider } from "./providers/mock-provider";

function buildCyclicGraph(): DependencyGraph {
  const nodes = new Map([
    ["a.ts", { id: "a.ts", relativePath: "src/a.ts" }],
    ["b.ts", { id: "b.ts", relativePath: "src/b.ts" }],
  ]);

  const outgoing = new Map([
    ["a.ts", new Set(["b.ts"])],
    ["b.ts", new Set(["a.ts"])],
  ]);

  const incoming = new Map([
    ["a.ts", new Set(["b.ts"])],
    ["b.ts", new Set(["a.ts"])],
  ]);

  return {
    nodes,
    edges: [
      { from: "a.ts", to: "b.ts", specifier: "./b" },
      { from: "b.ts", to: "a.ts", specifier: "./a" },
    ],
    incoming,
    outgoing,
  };
}

describe("suggestCycleFix", () => {
    it("resolves cycle ids to paths and returns a suggestion", async () => {
    const graph = buildCyclicGraph();
    const provider = new MockAiProvider();

    const result = await suggestCycleFix(provider, graph, ["a.ts", "b.ts"]);

    expect(result).toContain("[MOCK RESPONSE]");
    expect(provider.lastPrompt).toContain("src/a.ts");
    expect(provider.lastPrompt).toContain("src/b.ts");
    expect(provider.lastPrompt).toContain("circular dependency");
    });

  it("throws when given a size-1 SCC with no self-import", async () => {
    const graph = buildCyclicGraph();
    const provider = new MockAiProvider();

    await expect(
      suggestCycleFix(provider, graph, ["a.ts"])
    ).rejects.toThrow(/non-cyclic/);
  });
});