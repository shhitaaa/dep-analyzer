import { Router } from "express";
import {
  buildDependencyGraph,
  blastRadius,
  findStronglyConnectedComponents,
  findDeadCode,
  topologicalSort,
  computeCentrality,
  type DependencyGraph,
} from "@dep-analyzer/core";
import { summarizeBlastRadius, suggestCycleFix, scorePrRisk } from "@dep-analyzer/ai";
import { GroqProvider } from "../providers/groq-provider";
import { AnalyzeRequestBody } from "../types";
import { getCached, setCached } from "../cache";
import { resolveSourceToPath, getSourceKey } from "../github-clone";
import { createAiProvider } from "../providers/provider-factory";


const aiProvider = createAiProvider();


export const analyzeRouter = Router();

function toRelativePaths(graph: DependencyGraph, ids: string[]): string[] {
  return ids.map((id) => graph.nodes.get(id)?.relativePath ?? id);
}
function findIdByRelativePath(graph: DependencyGraph, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");

  for (const [id, node] of graph.nodes) {
    if (node.relativePath.replace(/\\/g, "/") === normalized) {
      return id;
    }
  }

  throw new Error(`No file found matching relative path: ${relativePath}`);
}

analyzeRouter.post("/blast-radius", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (!body.startId) {
    return res.status(400).json({ error: "startId is required" });
  }

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const resolvedStartId = findIdByRelativePath(graph, body.startId);
    const affected = blastRadius(graph, resolvedStartId);
    res.json({ affected: toRelativePaths(graph, affected) });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  } finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/blast-radius/summary", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (!body.startId) {
    return res.status(400).json({ error: "startId is required" });
  }

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const cacheKey = `blast-summary:${getSourceKey(body.source)}:${body.startId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const resolvedStartId = findIdByRelativePath(graph, body.startId);
    const affected = blastRadius(graph, resolvedStartId);
    const summary = await summarizeBlastRadius(aiProvider, graph, resolvedStartId, affected);
    const result = { affected: toRelativePaths(graph, affected), summary };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  } finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/cycles", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const sccs = findStronglyConnectedComponents(graph);
    res.json({ cycles: sccs.map((scc) => toRelativePaths(graph, scc)) });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  } finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/cycles/fix-suggestion", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (!Array.isArray(body.cycle) || body.cycle.length < 2) {
    return res.status(400).json({ error: "cycle must be an array of at least 2 files" });
  }

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const cacheKey = `fix-suggestion:${getSourceKey(body.source)}:${body.cycle.join(",")}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const resolvedCycle = body.cycle.map((id) => findIdByRelativePath(graph, id));
    const suggestion = await suggestCycleFix(aiProvider, graph, resolvedCycle);
    const result = { suggestion };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  }finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/dead-code", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const deadCode = findDeadCode(graph);
    res.json({ deadCode: toRelativePaths(graph, deadCode) });
    } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  }finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/topological-sort", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const order = topologicalSort(graph);
    res.json({ order: order.map((wave) => toRelativePaths(graph, wave)) });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  }finally {
    if (cleanup) await cleanup();
  }
});

analyzeRouter.post("/pr-risk-score", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (!Array.isArray(body.changedIds) || body.changedIds.length === 0) {
    return res.status(400).json({ error: "changedIds must be a non-empty array" });
  }

  let cleanup: (() => Promise<void>) | undefined;
  try {
    const cacheKey = `pr-risk:${getSourceKey(body.source)}:${body.changedIds.join(",")}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { resolvedPath, cleanup: cleanupFn } = await resolveSourceToPath(body.source);
    cleanup = cleanupFn;

    const graph = buildDependencyGraph(resolvedPath);
    const resolvedChangedIds = body.changedIds.map((id) => findIdByRelativePath(graph, id));
    const centrality = computeCentrality(graph);
    const riskAssessment = await scorePrRisk(aiProvider, graph, resolvedChangedIds, centrality);
    const result = { riskAssessment };
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to analyze repository";
    res.status(500).json({ error: message });
  }finally {
    if (cleanup) await cleanup();
  }
});