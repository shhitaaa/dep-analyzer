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

export function findStronglyConnectedComponents(graph: DependencyGraph): string[][] {
  let indexCounter = 0;
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  for (const id of graph.nodes.keys()) {
    if (!index.has(id)) {
      strongconnect(id);
    }
  }

  function strongconnect(v: string) {
    index.set(v, indexCounter);
    lowlink.set(v, indexCounter);
    indexCounter++;
    stack.push(v);
    onStack.add(v);

    const neighbors = graph.outgoing.get(v) ?? new Set<string>();

    for (const w of neighbors) {
        if (!index.has(w)) {
        // w hasn't been visited yet — recurse into it first
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
        // w is visited AND still on the stack — it's part of our current exploration
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
        // else: w is visited but NOT on stack — already resolved into an earlier SCC, ignore it
    }

    // If v's lowlink never got pulled below its own index, v is a root — pop the whole SCC
    if (lowlink.get(v) === index.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
        } while (w !== v);
        sccs.push(scc);
    }
  }

  return sccs;
}