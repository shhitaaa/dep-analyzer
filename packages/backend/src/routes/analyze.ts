import { Router } from "express";
import { buildDependencyGraph, blastRadius } from "@dep-analyzer/core";
import { AnalyzeRequestBody } from "../types";
import { MockAiProvider } from "@dep-analyzer/ai";
import { summarizeBlastRadius } from "@dep-analyzer/ai";


export const analyzeRouter = Router();

analyzeRouter.post("/blast-radius", (req, res) => {
  const body: AnalyzeRequestBody = req.body;

  if (body.source.type !== "local" || !body.source.path) {
    return res.status(400).json({ error: "Only local source type is supported right now" });
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

  if (body.source.type !== "local" || !body.source.path) {
    return res.status(400).json({ error: "Only local source type is supported right now" });
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