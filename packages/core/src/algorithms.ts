import { DependencyGraph } from "./types";

export function blastRadius(graph: DependencyGraph, startId: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [startId];
    visited.add(startId);
    const result: string[] = [];

    while (queue.length > 0) {
        const current = queue.shift()!;

        const importers = graph.incoming.get(current);
        if (!importers) continue;

        for (const importer of importers) {
        if (visited.has(importer)) continue;

        visited.add(importer);
        result.push(importer);
        queue.push(importer);
        }
    }

    return result;
}