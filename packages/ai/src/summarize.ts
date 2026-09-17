import { DependencyGraph } from "@dep-analyzer/core";
import { AiProvider } from "./types";

function buildPrompt(startPath: string, affectedPaths: string[]): string {
  if (affectedPaths.length === 0) {
    return `The file "${startPath}" has no other files depending on it. Write one sentence confirming it's safe to modify in isolation.`;
  }

  return `A developer is about to modify the file "${startPath}".
The following ${affectedPaths.length} file(s) depend on it, directly or transitively, and may be affected:
${affectedPaths.map((p) => `- ${p}`).join("\n")}

Write a concise, plain-English summary (2-4 sentences) of the blast radius of this change, aimed at a developer deciding how carefully to review or test this modification.`;
}

export async function summarizeBlastRadius(
  provider: AiProvider,
  graph: DependencyGraph,
  startId: string,
  affectedIds: string[]
): Promise<string> {
  const startPath = graph.nodes.get(startId)?.relativePath ?? startId;
  const affectedPaths = affectedIds.map(
    (id) => graph.nodes.get(id)?.relativePath ?? id
  );

  const prompt = buildPrompt(startPath, affectedPaths);
  return provider.complete(prompt);
}