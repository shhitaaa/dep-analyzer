const API_BASE_URL = "http://localhost:3001";

export interface AnalyzeSource {
  type: "local" | "github";
  path?: string;
  url?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function getBlastRadius(source: AnalyzeSource, startId: string) {
  return postJson<{ affected: string[] }>("/analyze/blast-radius", { source, startId });
}

export function getBlastRadiusSummary(source: AnalyzeSource, startId: string) {
  return postJson<{ affected: string[]; summary: string }>("/analyze/blast-radius/summary", { source, startId });
}

export function getCycles(source: AnalyzeSource) {
  return postJson<{ cycles: string[][] }>("/analyze/cycles", { source });
}

export function getCycleFixSuggestion(source: AnalyzeSource, cycle: string[]) {
  return postJson<{ suggestion: string }>("/analyze/cycles/fix-suggestion", { source, cycle });
}

export function getDeadCode(source: AnalyzeSource) {
  return postJson<{ deadCode: string[] }>("/analyze/dead-code", { source });
}

export function getTopologicalSort(source: AnalyzeSource) {
  return postJson<{ order: string[][] }>("/analyze/topological-sort", { source });
}

export function getPrRiskScore(source: AnalyzeSource, changedIds: string[]) {
  return postJson<{ riskAssessment: string }>("/analyze/pr-risk-score", { source, changedIds });
}