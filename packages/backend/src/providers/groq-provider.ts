import Groq from "groq-sdk";
import { AiProvider } from "@dep-analyzer/ai";

export class GroqProvider implements AiProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = "openai/gpt-oss-20b") {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content ?? "";
  }
}