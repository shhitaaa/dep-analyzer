import { DependencyGraph, blastRadius } from "@dep-analyzer/core";
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
    const affected = blastRadius(graph, id).map(
      (a) => graph.nodes.get(a)?.relativePath ?? a
    );
    return { path, score, importerCount, affected };
  });

  const prompt = buildPrompt(changedInfo);
  return provider.complete(prompt);
}
function buildPrompt(
  changedInfo: { path: string; score: number; importerCount: number; affected: string[] }[]
): string {
  const sorted = [...changedInfo].sort((a, b) => b.score - a.score);

  const lines = sorted.map((info) => {
    const reach = info.affected.length
      ? `, ${info.affected.length} file(s) affected transitively: ${info.affected.slice(0, 10).join(", ")}`
      : ", no files affected transitively";
    return `- ${info.path} (${info.importerCount} direct importer${info.importerCount === 1 ? "" : "s"}${reach}, centrality score: ${info.score})`;
  });

  return `A pull request modifies the following ${sorted.length} file(s), listed from most to least central in the codebase:
${lines.join("\n")}

"Centrality score" is the number of files that directly import each file. The list of transitively affected files shows how far a bug in that file could spread.

Based on this, assess the overall risk of this PR in 3-5 sentences. Call out which specific file(s), if any, warrant the most careful review, and give a rough risk level (Low / Medium / High) with a one-sentence justification.`;
}