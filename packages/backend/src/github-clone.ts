import simpleGit from "simple-git";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { AnalyzeRequestBody } from "./types";

export async function cloneGithubRepo(url: string): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `dep-analyzer-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const git = simpleGit();
  await git.clone(url, tempDir, ["--depth", "1"]);

  return tempDir;
}

export async function cleanupClone(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true, force: true });
}


export async function resolveSourceToPath(
  source: AnalyzeRequestBody["source"]
): Promise<{ resolvedPath: string; cleanup: () => Promise<void> }> {
  if (source.type === "local") {
    if (!source.path) {
      throw new Error("source.path is required for local source type");
    }
    return {
      resolvedPath: source.path,
      cleanup: async () => {}, // nothing to clean up for local paths
    };
  }

  if (source.type === "github") {
    if (!source.url) {
      throw new Error("source.url is required for github source type");
    }
    const tempDir = await cloneGithubRepo(source.url);
    return {
      resolvedPath: tempDir,
      cleanup: () => cleanupClone(tempDir),
    };
  }

  throw new Error(`Unknown source type: ${source.type}`);
}
export function getSourceKey(source: AnalyzeRequestBody["source"]): string {
  return source.type === "local" ? source.path! : source.url!;
}