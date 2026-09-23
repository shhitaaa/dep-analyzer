type Operation =
  | "blast-radius"
  | "blast-radius-summary"
  | "cycles"
  | "cycle-fix-suggestion"
  | "dead-code"
  | "topological-sort"
  | "pr-risk-score";

interface OperationSelectorProps {
  operation: Operation;
  startId: string;
  changedIds: string;
  onOperationChange: (op: Operation) => void;
  onStartIdChange: (value: string) => void;
  onChangedIdsChange: (value: string) => void;
}

function OperationSelector({
  operation,
  startId,
  changedIds,
  onOperationChange,
  onStartIdChange,
  onChangedIdsChange,
}: OperationSelectorProps) {
  const needsStartId = operation === "blast-radius" || operation === "blast-radius-summary";
  const needsChangedIds = operation === "pr-risk-score";

  return (
    <div>
      <select value={operation} onChange={(e) => onOperationChange(e.target.value as Operation)}>
        <option value="blast-radius">Blast Radius</option>
        <option value="blast-radius-summary">Blast Radius (with AI summary)</option>
        <option value="cycles">Find Cycles</option>
        <option value="dead-code">Find Dead Code</option>
        <option value="topological-sort">Topological Sort</option>
        <option value="pr-risk-score">PR Risk Score</option>
      </select>

      {needsStartId && (
        <input
          type="text"
          placeholder="File path to analyze (startId)"
          value={startId}
          onChange={(e) => onStartIdChange(e.target.value)}
        />
      )}

      {needsChangedIds && (
        <input
          type="text"
          placeholder="Changed file paths, comma-separated"
          value={changedIds}
          onChange={(e) => onChangedIdsChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default OperationSelector;