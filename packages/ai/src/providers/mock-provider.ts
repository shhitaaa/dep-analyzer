import { AiProvider } from "../types";

export class MockAiProvider implements AiProvider {
  async complete(prompt: string): Promise<string> {
    return `[MOCK RESPONSE] Prompt received (${prompt.length} chars). This is a placeholder summary.`;
  }
}