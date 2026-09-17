import { DependencyGraph } from "@dep-analyzer/core";
import { AiProvider } from "./types";

export async function scorePrRisk(
  provider: AiProvider,
  graph: DependencyGraph,
  changedIds: string[],
  centrality: Map<string, number>
): Promise<string> {
  const changedInfo = changedIds.map((id) => {
    const path = graph.nodes.get(id)?.relativePath ?? id;
    const score = centrality.get(id) ?? 0;
    const importerCount = graph.incoming.get(id)?.size ?? 0;
    return { path, score, importerCount };
  });

  const prompt = buildPrompt(changedInfo);
  return provider.complete(prompt);
}
function buildPrompt(
  changedInfo: { path: string; score: number; importerCount: number }[]
): string {
  const sorted = [...changedInfo].sort((a, b) => b.score - a.score);

  const lines = sorted.map(
    (info) =>
      `- ${info.path} (${info.importerCount} direct importer${info.importerCount === 1 ? "" : "s"}, centrality score: ${info.score})`
  );

  return `A pull request modifies the following ${sorted.length} file(s), listed from most to least central in the codebase:
${lines.join("\n")}

"Centrality score" reflects how many other files directly depend on each file — higher means more of the codebase could be affected by a bug here.

Based on this, assess the overall risk of this PR in 3-5 sentences. Call out which specific file(s), if any, warrant the most careful review, and give a rough risk level (Low / Medium / High) with a one-sentence justification.`;
}