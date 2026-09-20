import { AiProvider, MockAiProvider } from "@dep-analyzer/ai";
import { GroqProvider } from "./groq-provider";

export function createAiProvider(): AiProvider {
  if (process.env.NODE_ENV === "test") {
    return new MockAiProvider();
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  return new GroqProvider(apiKey);
}