import { DependencyGraph } from "@dep-analyzer/core";
import { AiProvider } from "./types";

export async function suggestCycleFix(
  provider: AiProvider,
  graph: DependencyGraph,
  cycle: string[]
): Promise<string> {
  if (cycle.length === 1 && !isSelfImport(graph, cycle[0])) {
    throw new Error(
      `suggestCycleFix called with a non-cyclic SCC: "${cycle[0]}" has no self-import.`
    );
  }

  const cyclePaths = cycle.map(
    (id) => graph.nodes.get(id)?.relativePath ?? id
  );

  const prompt = buildPrompt(cyclePaths);
  return provider.complete(prompt);
}

function isSelfImport(graph: DependencyGraph, id: string): boolean {
  return graph.outgoing.get(id)?.has(id) ?? false;
}
function buildPrompt(cyclePaths: string[]): string {
  return `The following files form a circular dependency (each imports the next, and the last imports back to the first):
${cyclePaths.map((p) => `- ${p}`).join("\n")}

Suggest a concrete way to break this cycle — for example, extracting a shared interface/type into a new file, inverting one of the dependencies, or moving shared logic to a common module. Keep the suggestion to 2-4 sentences and be specific about which file(s) should change.`;
}