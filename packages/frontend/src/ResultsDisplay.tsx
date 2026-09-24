type Operation =
  | "blast-radius"
  | "blast-radius-summary"
  | "cycles"
  | "cycle-fix-suggestion"
  | "dead-code"
  | "topological-sort"
  | "pr-risk-score";

interface ResultsDisplayProps {
  operation: Operation;
  result: unknown;
}

function ResultsDisplay({ operation, result }: ResultsDisplayProps) {
  if (operation === "blast-radius" || operation === "blast-radius-summary") {
    const data = result as { affected: string[]; summary?: string };
    return (
      <div>
        <h3>Affected files</h3>
        {data.affected.length === 0 ? (
          <p>No files are affected.</p>
        ) : (
          <ul>
            {data.affected.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        )}
        {data.summary && (
          <>
            <h3>Summary</h3>
            <p>{data.summary}</p>
          </>
        )}
      </div>
    );
  }

  if (operation === "dead-code") {
    const data = result as { deadCode: string[] };
    return (
      <div>
        <h3>Dead code</h3>
        {data.deadCode.length === 0 ? (
          <p>No dead code found.</p>
        ) : (
          <ul>
            {data.deadCode.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (operation === "topological-sort") {
    const data = result as { order: string[][] };
    return (
      <div>
        <h3>Build order</h3>
        <ol>
          {data.order.map((wave, i) => (
            <li key={i}>{wave.join(", ")}</li>
          ))}
        </ol>
      </div>
    );
  }

  if (operation === "pr-risk-score") {
    const data = result as { riskAssessment: string };
    return (
      <div>
        <h3>Risk assessment</h3>
        <p>{data.riskAssessment}</p>
      </div>
    );
  }

  return null;
}

export default ResultsDisplay;