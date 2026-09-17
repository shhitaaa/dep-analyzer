import { describe, it, expect } from "vitest";
import { DependencyGraph } from "@dep-analyzer/core";
import { scorePrRisk } from "./score-risk";
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

describe("scorePrRisk", () => {
  it("scores a diff touching a high-centrality file", async () => {
    const graph = buildTestGraph();
    const provider = new MockAiProvider();
    const centrality = new Map([
      ["a.ts", 2],
      ["b.ts", 0],
      ["c.ts", 0],
    ]);

    const result = await scorePrRisk(
      provider,
      graph,
      ["a.ts", "b.ts"],
      centrality
    );

    expect(result).toContain("[MOCK RESPONSE]");
  });

  it("handles a diff with no centrality data gracefully", async () => {
    const graph = buildTestGraph();
    const provider = new MockAiProvider();
    const centrality = new Map<string, number>();

    const result = await scorePrRisk(provider, graph, ["b.ts"], centrality);

    expect(result).toContain("[MOCK RESPONSE]");
  });
});