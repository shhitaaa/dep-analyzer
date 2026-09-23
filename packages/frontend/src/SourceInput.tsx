interface SourceInputProps {
  sourceType: "local" | "github";
  sourceValue: string;
  onSourceTypeChange: (type: "local" | "github") => void;
  onSourceValueChange: (value: string) => void;
}

function SourceInput({
  sourceType,
  sourceValue,
  onSourceTypeChange,
  onSourceValueChange,
}: SourceInputProps) {
  return (
    <div>
      <label>
        <input
          type="radio"
          name="sourceType"
          value="local"
          checked={sourceType === "local"}
          onChange={() => onSourceTypeChange("local")}
        />
        Local path
      </label>
      <label>
        <input
          type="radio"
          name="sourceType"
          value="github"
          checked={sourceType === "github"}
          onChange={() => onSourceTypeChange("github")}
        />
        GitHub URL
      </label>

      <input
        type="text"
        placeholder={sourceType === "local" ? "C:/path/to/project/src" : "https://github.com/user/repo"}
        value={sourceValue}
        onChange={(e) => onSourceValueChange(e.target.value)}
      />
    </div>
  );
}

export default SourceInput;