import { AiProvider } from "../types";

export class MockAiProvider implements AiProvider {
  lastPrompt: string | null = null;

  async complete(prompt: string): Promise<string> {
    this.lastPrompt = prompt;
    return `[MOCK RESPONSE] Prompt received (${prompt.length} chars). This is a placeholder summary.`;
  }
}