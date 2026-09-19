export interface AnalyzeRequestBody {
  source: {
    type: "local" | "github";
    path?: string;  // used when type === "local"
    url?: string;   // used when type === "github", added in the next step
  };
  startId: string;
}