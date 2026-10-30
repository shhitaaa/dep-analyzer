import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { normalizeGithubUrl, resolveSourceToPath } from "./github-clone";

describe("normalizeGithubUrl", () => {
  it("adds .git to a plain repo URL", () => {
    expect(normalizeGithubUrl("https://github.com/user/repo")).toBe(
      "https://github.com/user/repo.git"
    );
  });

  it("gives the same result with .git, a trailing slash, or surrounding spaces", () => {
    const expected = "https://github.com/user/repo.git";
    expect(normalizeGithubUrl("https://github.com/user/repo.git")).toBe(expected);
    expect(normalizeGithubUrl("https://github.com/user/repo/")).toBe(expected);
    expect(normalizeGithubUrl("  https://github.com/user/repo  ")).toBe(expected);
  });

  it("rejects anything that isn't a plain GitHub repo URL", () => {
    const bad = [
      "http://github.com/user/repo",
      "https://gitlab.com/user/repo",
      "https://github.com/user",
      "https://github.com/user/repo/tree/main",
      "https://github.com/user/..",
      "not a url",
      "",
    ];
    for (const url of bad) {
      expect(() => normalizeGithubUrl(url)).toThrow(/valid GitHub repository URL/);
    }
  });
});

describe("resolveSourceToPath local-source guard", () => {
  const original = process.env.ALLOW_LOCAL_SOURCES;

  beforeEach(() => {
    delete process.env.ALLOW_LOCAL_SOURCES;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_LOCAL_SOURCES;
    else process.env.ALLOW_LOCAL_SOURCES = original;
  });

  it("rejects local paths when ALLOW_LOCAL_SOURCES is not set", async () => {
    await expect(
      resolveSourceToPath({ type: "local", path: "/some/path" })
    ).rejects.toThrow(/Local paths are not supported/);
  });

  it("rejects local paths when ALLOW_LOCAL_SOURCES is anything other than 'true'", async () => {
    for (const value of ["false", "1", "TRUE", ""]) {
      process.env.ALLOW_LOCAL_SOURCES = value;
      await expect(
        resolveSourceToPath({ type: "local", path: "/some/path" })
      ).rejects.toThrow(/Local paths are not supported/);
    }
  });

  it("allows local paths when ALLOW_LOCAL_SOURCES is 'true'", async () => {
    process.env.ALLOW_LOCAL_SOURCES = "true";
    const { resolvedPath, cleanup } = await resolveSourceToPath({
      type: "local",
      path: "/some/path",
    });
    expect(resolvedPath).toBe("/some/path");
    await cleanup(); // should do nothing and not throw
  });

  it("requires a path when the local source is allowed", async () => {
    process.env.ALLOW_LOCAL_SOURCES = "true";
    await expect(resolveSourceToPath({ type: "local" })).rejects.toThrow(
      /source.path is required/
    );
  });
});