import { useState } from "react";
import type { AnalyzeSource } from "./api";
import SourceInput from "./SourceInput";
import OperationSelector from "./OperationSelector";
import {
  getBlastRadius,
  getBlastRadiusSummary,
  getCycles,
  getDeadCode,
  getTopologicalSort,
  getPrRiskScore,
  getCycleFixSuggestion,
} from "./api";

type Operation =
  | "blast-radius"
  | "blast-radius-summary"
  | "cycles"
  | "cycle-fix-suggestion"
  | "dead-code"
  | "topological-sort"
  | "pr-risk-score";

function App() {
  const [sourceType, setSourceType] = useState<"local" | "github">("local");
  const [sourceValue, setSourceValue] = useState("");
  const [operation, setOperation] = useState<Operation>("blast-radius");
  const [startId, setStartId] = useState("");
  const [changedIds, setChangedIds] = useState("");

  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fixSuggestions, setFixSuggestions] = useState<Record<string, string>>({});
  const [fixLoadingKey, setFixLoadingKey] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);

    const normalizedSourceValue = sourceValue.replace(/\\/g, "/");
    const normalizedStartId = startId.replace(/\\/g, "/");
    const normalizedChangedIds = changedIds.replace(/\\/g, "/");

    const source: AnalyzeSource = {
      type: sourceType,
      ...(sourceType === "local" ? { path: normalizedSourceValue } : { url: normalizedSourceValue }),
    };

    try {
      let data: unknown;

      switch (operation) {
        case "blast-radius":
          data = await getBlastRadius(source, normalizedStartId);
          break;
        case "blast-radius-summary":
          data = await getBlastRadiusSummary(source, normalizedStartId);
          break;
        case "cycles":
          data = await getCycles(source);
          break;
        case "dead-code":
          data = await getDeadCode(source);
          break;
        case "topological-sort":
          data = await getTopologicalSort(source);
          break;
        case "pr-risk-score":
          data = await getPrRiskScore(source, normalizedChangedIds.split(",").map((s) => s.trim()));
          break;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGetFixSuggestion(cycle: string[]) {
    const key = cycle.join(",");
    setFixLoadingKey(key);

    const normalizedSourceValue = sourceValue.replace(/\\/g, "/");
    const source: AnalyzeSource = {
      type: sourceType,
      ...(sourceType === "local" ? { path: normalizedSourceValue } : { url: normalizedSourceValue }),
    };

    try {
      const data = await getCycleFixSuggestion(source, cycle);
      setFixSuggestions((prev) => ({ ...prev, [key]: data.suggestion }));
    } catch (err) {
      setFixSuggestions((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Failed to get suggestion",
      }));
    } finally {
      setFixLoadingKey(null);
    }
  }

  return (
  <div>
    <h1>Dependency Analyzer</h1>
    <SourceInput
      sourceType={sourceType}
      sourceValue={sourceValue}
      onSourceTypeChange={setSourceType}
      onSourceValueChange={setSourceValue}
    />
    <OperationSelector
      operation={operation}
      startId={startId}
      changedIds={changedIds}
      onOperationChange={setOperation}
      onStartIdChange={setStartId}
      onChangedIdsChange={setChangedIds}
    />
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? "Analyzing..." : "Analyze"}
    </button>

    {error && <p style={{ color: "red" }}>{error}</p>}

    {result != null && operation === "cycles" && (
      <div>
        {(result as { cycles: string[][] }).cycles
          .filter((scc) => scc.length > 1)
          .map((cycle) => {
            const key = cycle.join(",");
            return (
              <div key={key}>
                <p>{cycle.join(" → ")}</p>
                <button
                  onClick={() => handleGetFixSuggestion(cycle)}
                  disabled={fixLoadingKey === key}
                >
                  {fixLoadingKey === key ? "Getting suggestion..." : "Suggest fix"}
                </button>
                {fixSuggestions[key] && <p>{fixSuggestions[key]}</p>}
              </div>
            );
          })}
      </div>
    )}

    {result != null && operation !== "cycles" && (
      <pre>{JSON.stringify(result, null, 2)}</pre>
    )}
  </div>
);
}

export default App;