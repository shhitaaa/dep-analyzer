import express from "express";
import { buildDependencyGraph, blastRadius } from "@dep-analyzer/core";
import { AnalyzeRequestBody } from "./types";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/analyze/blast-radius", (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});