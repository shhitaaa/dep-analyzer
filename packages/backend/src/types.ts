export interface AnalyzeRequestBody {
  source: {
    type: "local" | "github";
    path?: string;
    url?: string;
  };
  startId?: string;
  cycle?: string[];
  changedIds?: string[];
}