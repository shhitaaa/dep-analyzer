interface SourceInputProps {
  sourceValue: string;
  onSourceValueChange: (value: string) => void;
}

function SourceInput({ sourceValue, onSourceValueChange }: SourceInputProps) {
  return (
    <div>
      <input
        type="text"
        placeholder="https://github.com/user/repo"
        value={sourceValue}
        onChange={(e) => onSourceValueChange(e.target.value)}
      />
      <p className="hint">
        Want to analyze a local project? Use the command-line package.
      </p>
      <p className="hint">
        Analyzes JavaScript and TypeScript files only (.js, .jsx, .ts, .tsx).
      </p>
    </div>
  );
}

export default SourceInput;