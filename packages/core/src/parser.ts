import {
  ExportDeclaration,
  ImportDeclaration,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  ts,
} from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import { DependencyGraph, GraphNode, GraphEdge, UnresolvedImport } from "./types";

// Folders that hold dependencies or generated output, not your own source.
const IGNORED_DIRS = [
  "node_modules", "dist", "build",
  ".git", ".next", ".nuxt", ".svelte-kit", ".output", ".cache", ".turbo",
  ".yarn", ".pnpm-store", ".parcel-cache", ".vercel", ".idea", ".vscode",
];

interface ImportRef {
  specifier: string;
  typeOnly: boolean;
}

interface WorkspacePackage {
  name: string;
  dir: string;
  manifest: any;
}

interface ResolveContext {
  rootDir: string;
  project: Project;
  configCache: Map<string, ts.CompilerOptions | null>; // keyed by directory
  workspaces: WorkspacePackage[];
}

export function buildDependencyGraph(rootDir: string): DependencyGraph {
  const project = new Project({
    compilerOptions: {
      allowJs: true,
    },
  });

  project.addSourceFilesAtPaths([
    path.join(rootDir, "**/*.{js,jsx,ts,tsx}"),
    // The glob above skips dot-directories (e.g. .vitepress), so add them explicitly:
    // nested ones, and ones directly under the root.
    path.join(rootDir, "**/.*/**/*.{js,jsx,ts,tsx}"),
    path.join(rootDir, ".*/**/*.{js,jsx,ts,tsx}"),
    ...IGNORED_DIRS.map((dir) => `!${path.join(rootDir, `**/${dir}/**`)}`),
  ]);
  const sourceFiles = project.getSourceFiles();

  const ctx: ResolveContext = {
    rootDir,
    project,
    configCache: new Map(),
    workspaces: loadWorkspaces(rootDir),
  };

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const unresolved: UnresolvedImport[] = [];
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const runtimeOutgoing = new Map<string, Set<string>>();

  // First pass: register every file as a node.
  for (const sf of sourceFiles) {
    const id = sf.getFilePath();
    nodes.set(id, { id, relativePath: path.relative(rootDir, id) });
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
    runtimeOutgoing.set(id, new Set());
  }

  // Second pass: walk imports and add edges.
  for (const sf of sourceFiles) {
    const fromId = sf.getFilePath();

    for (const ref of collectImports(sf)) {
      const { specifier, typeOnly } = ref;
      const toId = resolveSpecifier(sf, specifier, ctx);

      if (!toId) {
        // Bare specifiers ("lodash") are external packages; only relative ones can be "unresolved".
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
          unresolved.push({ from: fromId, specifier });
        }
        continue;
      }

      edges.push(typeOnly ? { from: fromId, to: toId, specifier, typeOnly: true } : { from: fromId, to: toId, specifier });
      outgoing.get(fromId)!.add(toId);
      incoming.get(toId)!.add(fromId);
      if (!typeOnly) runtimeOutgoing.get(fromId)!.add(toId);
    }
  }

  // Mark entry points: nodes nothing points at.
  for (const [id, node] of nodes) {
    node.isEntry = (incoming.get(id)?.size ?? 0) === 0;
  }

  return { nodes, edges, outgoing, incoming, runtimeOutgoing, unresolved };
}

// ---------------------------------------------------------------------------
// Finding imports
// ---------------------------------------------------------------------------

function isTypeOnlyImport(imp: ImportDeclaration): boolean {
  if (imp.isTypeOnly()) return true;
  // import { type A, type B } from "./x"  (every binding is a type)
  const named = imp.getNamedImports();
  return (
    named.length > 0 &&
    !imp.getDefaultImport() &&
    !imp.getNamespaceImport() &&
    named.every((n) => n.isTypeOnly())
  );
}

function isTypeOnlyExport(exp: ExportDeclaration): boolean {
  if (exp.isTypeOnly()) return true;
  const named = exp.getNamedExports();
  return named.length > 0 && named.every((n) => n.isTypeOnly());
}

function collectImports(sf: SourceFile): ImportRef[] {
  const refs: ImportRef[] = [];

  for (const imp of sf.getImportDeclarations()) {
    refs.push({ specifier: imp.getModuleSpecifierValue(), typeOnly: isTypeOnlyImport(imp) });
  }

  // Re-exports: export { x } from "./a" and export * from "./b"
  for (const exp of sf.getExportDeclarations()) {
    const specifier = exp.getModuleSpecifierValue();
    if (specifier) refs.push({ specifier, typeOnly: isTypeOnlyExport(exp) });
  }

  // Dynamic imports: import("./lazy") and CommonJS: require("./util")
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    const isDynamicImport = callee.getKind() === SyntaxKind.ImportKeyword;
    const isRequire = Node.isIdentifier(callee) && callee.getText() === "require";
    if (!isDynamicImport && !isRequire) continue;

    const [arg] = call.getArguments();
    if (arg && Node.isStringLiteral(arg)) {
      refs.push({ specifier: arg.getLiteralValue(), typeOnly: false });
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Resolving imports to files
// ---------------------------------------------------------------------------

function resolveSpecifier(sf: SourceFile, specifier: string, ctx: ResolveContext): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return resolveRelative(sf, specifier);
  }

  // Not relative: it's either an alias from tsconfig/jsconfig, a package inside this
  // repo's workspaces, or a real external package (which we leave out of the graph).
  return resolveViaTsconfig(sf, specifier, ctx) ?? resolveWorkspaceImport(specifier, ctx);
}

function resolveRelative(sf: SourceFile, specifier: string): string | null {
  const dir = path.dirname(sf.getFilePath());
  return resolveFromBase(sf.getProject(), path.resolve(dir, specifier));
}

// Try a path as: exact file, with an extension, as a directory index, or (TypeScript ESM
// style) "./foo.js" standing in for foo.ts.
function resolveFromBase(project: Project, base: string): string | null {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`];

  // Directory imports: "./lib" or ".." resolve to <dir>/index.*
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    candidates.push(path.join(base, `index${ext}`));
  }

  // TypeScript ESM style: source says "./foo.js" but the file on disk is foo.ts
  if (base.endsWith(".js")) {
    const stem = base.slice(0, -3);
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  } else if (base.endsWith(".jsx")) {
    candidates.push(`${base.slice(0, -4)}.tsx`);
  }

  for (const candidate of candidates) {
    const match = project.getSourceFile(candidate);
    if (match) return match.getFilePath();
  }

  return null;
}

// --- tsconfig / jsconfig aliases ("paths" and "baseUrl") ---

function resolveViaTsconfig(sf: SourceFile, specifier: string, ctx: ResolveContext): string | null {
  const options = findAliasOptions(sf.getFilePath(), ctx);
  if (!options) return null;

  // Let TypeScript's own resolver apply "paths"/"baseUrl" for us.
  const result = ts.resolveModuleName(
    specifier,
    sf.getFilePath(),
    { ...options, allowJs: true, moduleResolution: ts.ModuleResolutionKind.Bundler },
    ts.sys
  );
  const resolved = result.resolvedModule;
  if (!resolved || resolved.isExternalLibraryImport) return null;

  return ctx.project.getSourceFile(resolved.resolvedFileName)?.getFilePath() ?? null;
}

// Walk up from the file to the nearest tsconfig.json/jsconfig.json (stopping at the repo root)
// and return its options only if it defines aliases. Results are cached per directory.
function findAliasOptions(filePath: string, ctx: ResolveContext): ts.CompilerOptions | null {
  const root = path.resolve(ctx.rootDir);
  const visited: string[] = [];
  let found: ts.CompilerOptions | null = null;
  let dir = path.dirname(path.resolve(filePath));

  while (true) {
    if (ctx.configCache.has(dir)) {
      found = ctx.configCache.get(dir)!;
      break;
    }
    visited.push(dir);

    const configPath = ["tsconfig.json", "jsconfig.json"]
      .map((name) => path.join(dir, name))
      .find((candidate) => fs.existsSync(candidate));
    if (configPath) {
      found = loadAliasOptions(configPath, 0);
      break;
    }

    const parent = path.dirname(dir);
    if (dir === root || parent === dir) break;
    dir = parent;
  }

  for (const d of visited) ctx.configCache.set(d, found);
  return found;
}

function loadAliasOptions(configPath: string, depth: number): ts.CompilerOptions | null {
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error || !read.config) return null;

  // Empty file lists so TypeScript doesn't scan the whole repo; we only want the options
  // (it still follows "extends").
  const config = { ...read.config, files: [], include: [], exclude: [] };
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath), undefined, configPath);
  if (parsed.options.paths || parsed.options.baseUrl) return parsed.options;

  // Solution-style tsconfig (common in Vite templates): the aliases live in a referenced config.
  if (depth < 3 && Array.isArray(read.config.references)) {
    for (const ref of read.config.references) {
      if (!ref || typeof ref.path !== "string") continue;
      let refPath = path.resolve(path.dirname(configPath), ref.path);
      if (!refPath.endsWith(".json")) refPath = path.join(refPath, "tsconfig.json");
      if (!fs.existsSync(refPath)) continue;

      const refOptions = loadAliasOptions(refPath, depth + 1);
      if (refOptions) return refOptions;
    }
  }

  return null;
}

// --- monorepo workspace packages ("@acme/core" -> packages/core) ---

function resolveWorkspaceImport(specifier: string, ctx: ResolveContext): string | null {
  // Longest matching package name wins ("@acme/core" before "@acme").
  let match: WorkspacePackage | null = null;
  for (const pkg of ctx.workspaces) {
    if (specifier === pkg.name || specifier.startsWith(`${pkg.name}/`)) {
      if (!match || pkg.name.length > match.name.length) match = pkg;
    }
  }
  if (!match) return null;

  const subpath = specifier.slice(match.name.length + 1); // "" for the package root
  const { project } = ctx;

  const targets: string[] = [];
  if (subpath) {
    targets.push(...exportTargets(match.manifest.exports?.[`./${subpath}`]));
    // Plain sub-file import: "@acme/core/util" -> util or src/util
    for (const t of [subpath, path.join("src", subpath)]) {
      const hit = resolveFromBase(project, path.join(match.dir, t));
      if (hit) return hit;
    }
  } else {
    const exp = match.manifest.exports;
    targets.push(...exportTargets(typeof exp === "string" || Array.isArray(exp) ? exp : exp?.["."]));
    for (const field of ["source", "module", "main", "types", "typings"]) {
      if (typeof match.manifest[field] === "string") targets.push(match.manifest[field]);
    }
  }

  for (const target of targets) {
    for (const candidate of entryCandidates(target)) {
      const hit = resolveFromBase(project, path.join(match.dir, candidate));
      if (hit) return hit;
    }
  }

  if (!subpath) {
    for (const fallback of [path.join("src", "index"), "index"]) {
      const hit = resolveFromBase(project, path.join(match.dir, fallback));
      if (hit) return hit;
    }
  }

  return null;
}

// "./dist/index.d.ts" -> ["dist/index", "src/index"]: packages usually point at build output,
// but the source we can actually analyze lives in src/.
function entryCandidates(target: string): string[] {
  let t = target.replace(/^\.\//, "").replace(/\.d\.(ts|mts|cts)$/, "");
  const out = [t];
  const mapped = t.replace(/^(dist|build|lib|out)\//, "src/");
  if (mapped !== t) out.push(mapped);
  return out;
}

function exportTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(exportTargets);
  if (value && typeof value === "object") return Object.values(value).flatMap(exportTargets);
  return [];
}

function loadWorkspaces(rootDir: string): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  const seen = new Set<string>();

  for (const pattern of readWorkspacePatterns(rootDir)) {
    for (const dir of expandWorkspacePattern(rootDir, pattern)) {
      if (seen.has(dir)) continue;
      seen.add(dir);

      const manifest = readJson(path.join(dir, "package.json"));
      if (manifest && typeof manifest.name === "string") {
        packages.push({ name: manifest.name, dir, manifest });
      }
    }
  }

  return packages;
}

function readWorkspacePatterns(rootDir: string): string[] {
  const patterns: string[] = [];

  // npm / yarn: "workspaces": [...] or { "packages": [...] }
  const rootManifest = readJson(path.join(rootDir, "package.json"));
  const ws = rootManifest?.workspaces;
  const list = Array.isArray(ws) ? ws : Array.isArray(ws?.packages) ? ws.packages : [];
  for (const p of list) if (typeof p === "string") patterns.push(p);

  // pnpm: pnpm-workspace.yaml with a "packages:" list
  try {
    const yaml = fs.readFileSync(path.join(rootDir, "pnpm-workspace.yaml"), "utf8");
    let inPackages = false;
    for (const line of yaml.split(/\r?\n/)) {
      if (/^packages\s*:/.test(line)) { inPackages = true; continue; }
      if (inPackages) {
        const item = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*(#.*)?$/);
        if (item) patterns.push(item[1]);
        else if (/^\S/.test(line)) inPackages = false; // next top-level key
      }
    }
  } catch {
    // no pnpm-workspace.yaml
  }

  return patterns.filter((p) => !p.startsWith("!"));
}

// Supports exact folders, "dir/*" and "dir/**", which covers the common setups.
function expandWorkspacePattern(rootDir: string, pattern: string): string[] {
  const clean = pattern.replace(/^\.\//, "").replace(/\/+$/, "");

  if (clean.endsWith("/**")) return listDirs(path.join(rootDir, clean.slice(0, -3)), 3);
  if (clean.endsWith("/*")) return listDirs(path.join(rootDir, clean.slice(0, -2)), 1);
  if (!clean.includes("*")) return [path.join(rootDir, clean)];
  return [];
}

function listDirs(base: string, depth: number): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const dir = path.join(base, entry.name);
    out.push(dir);
    if (depth > 1) out.push(...listDirs(dir, depth - 1));
  }
  return out;
}

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
