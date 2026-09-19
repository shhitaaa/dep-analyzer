import { Router } from "express";
import {
  buildDependencyGraph,
  blastRadius,
  findStronglyConnectedComponents,
  findDeadCode,
  topologicalSort,
  computeCentrality,
} from "@dep-analyzer/core";
import { MockAiProvider, summarizeBlastRadius, suggestCycleFix, scorePrRisk } from "@dep-analyzer/ai";
import { AnalyzeRequestBody } from "../types";


export const analyzeRouter = Router();

analyzeRouter.post("/blast-radius", (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  if (body.source.type !== "local" || !body.source.path || !body.startId) {
    return res.status(400).json({ error: "source.path and startId are required" });
    }

  try {
    const graph = buildDependencyGraph(body.source.path);
    const affected = blastRadius(graph, body.startId);
    res.json({ affected });
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});

const aiProvider = new MockAiProvider();

analyzeRouter.post("/blast-radius/summary", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  if (body.source.type !== "local" || !body.source.path || !body.startId) {
    return res.status(400).json({ error: "source.path and startId are required" });
    }

  try {
    const graph = buildDependencyGraph(body.source.path);
    const affected = blastRadius(graph, body.startId);
    const summary = await summarizeBlastRadius(aiProvider, graph, body.startId, affected);
    res.json({ affected, summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});

analyzeRouter.post("/cycles", (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (body.source.type !== "local" || !body.source.path) {
    return res.status(400).json({ error: "Only local source type is supported right now" });
  }
  try {
    const graph = buildDependencyGraph(body.source.path);
    const sccs = findStronglyConnectedComponents(graph);
    res.json({ cycles: sccs });
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});

analyzeRouter.post("/cycles/fix-suggestion", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (body.source.type !== "local" || !body.source.path || !body.cycle) {
    return res.status(400).json({ error: "source.path and cycle are required" });
  }
  try {
    const graph = buildDependencyGraph(body.source.path);
    const suggestion = await suggestCycleFix(aiProvider, graph, body.cycle);
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate fix suggestion" });
  }
});

analyzeRouter.post("/dead-code", (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (body.source.type !== "local" || !body.source.path) {
    return res.status(400).json({ error: "Only local source type is supported right now" });
  }
  try {
    const graph = buildDependencyGraph(body.source.path);
    const deadCode = findDeadCode(graph);
    res.json({ deadCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});

analyzeRouter.post("/topological-sort", (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (body.source.type !== "local" || !body.source.path) {
    return res.status(400).json({ error: "Only local source type is supported right now" });
  }
  try {
    const graph = buildDependencyGraph(body.source.path);
    const order = topologicalSort(graph);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze repository" });
  }
});

analyzeRouter.post("/pr-risk-score", async (req, res) => {
  const body: AnalyzeRequestBody = req.body;
  if (body.source.type !== "local" || !body.source.path || !body.changedIds) {
    return res.status(400).json({ error: "source.path and changedIds are required" });
  }
  try {
    const graph = buildDependencyGraph(body.source.path);
    const centrality = computeCentrality(graph);
    const riskAssessment = await scorePrRisk(aiProvider, graph, body.changedIds, centrality);
    res.json({ riskAssessment });
  } catch (err) {
    res.status(500).json({ error: "Failed to score PR risk" });
  }
});