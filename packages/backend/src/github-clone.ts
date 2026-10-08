import simpleGit from "simple-git";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import { AnalyzeRequestBody } from "./types";

// Stop git from waiting for a username/password on private or missing repos
process.env.GIT_TERMINAL_PROMPT = "0";

const GITHUB_REPO_URL =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export function normalizeGithubUrl(raw: string): string {
  const match = GITHUB_REPO_URL.exec(raw.trim());
  if (!match || /^\.+$/.test(match[1]) || /^\.+$/.test(match[2])) {
    throw new Error(
      "Please enter a valid GitHub repository URL, like https://github.com/user/repo"
    );
  }
  return `https://github.com/${match[1]}/${match[2]}.git`;
}

export async function cloneGithubRepo(url: string): Promise<string> {
  const safeUrl = normalizeGithubUrl(url);
  const tempDir = path.join(
    os.tmpdir(),
    `dep-analyzer-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const git = simpleGit({ timeout: { block: 60_000 } });

  try {
    await git.clone(safeUrl, tempDir, ["--depth", "1"]);
  } catch (err) {
    console.error("git clone failed:", err);
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(
      "Could not clone the repository. Check that the URL is correct and the repository is public."
    );
  }

  return tempDir;
}

export async function cleanupClone(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true, force: true });
}

export async function resolveSourceToPath(
  source: AnalyzeRequestBody["source"]
): Promise<{ resolvedPath: string; cleanup: () => Promise<void> }> {
  if (source.type === "local") {
    if (process.env.ALLOW_LOCAL_SOURCES !== "true") {
      throw new Error("Local paths are not supported on this server. Use a GitHub URL.");
    }
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
  if (source.type === "local") return source.path ?? "";
  return normalizeGithubUrl(source.url ?? "");
}