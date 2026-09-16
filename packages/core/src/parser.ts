import { Project, SourceFile } from "ts-morph";
import * as path from "path";
import { DependencyGraph, GraphNode, GraphEdge } from "./types";

export function buildDependencyGraph(rootDir: string): DependencyGraph {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
    },
  });

  project.addSourceFilesAtPaths([
    path.join(rootDir, "**/*.{js,jsx,ts,tsx}"),
    `!${path.join(rootDir, "**/node_modules/**")}`,
    `!${path.join(rootDir, "**/dist/**")}`,
    `!${path.join(rootDir, "**/build/**")}`,
  ]);
  const sourceFiles = project.getSourceFiles();

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  // First pass: register every file as a node.
  for (const sf of sourceFiles) {
    const id = sf.getFilePath();
    nodes.set(id, { id, relativePath: path.relative(rootDir, id) });
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  // Second pass: walk imports and add edges.
  for (const sf of sourceFiles) {
    const fromId = sf.getFilePath();

    for (const imp of sf.getImportDeclarations()) {
      const specifier = imp.getModuleSpecifierValue();
      const toId = resolveSpecifier(sf, specifier);

      if (!toId) continue;

      edges.push({ from: fromId, to: toId, specifier });
      outgoing.get(fromId)!.add(toId);
      incoming.get(toId)!.add(fromId);
    }
  }

  // Mark entry points: nodes nothing points at.
  for (const [id, node] of nodes) {
    node.isEntry = (incoming.get(id)?.size ?? 0) === 0;
  }

  return { nodes, edges, outgoing, incoming };
}

function resolveSpecifier(sf: SourceFile, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const dir = path.dirname(sf.getFilePath());
  const base = path.resolve(dir, specifier);

  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`];

  const project = sf.getProject();
  for (const candidate of candidates) {
    const match = project.getSourceFile(candidate);
    if (match) return match.getFilePath();
  }

  return null;
}