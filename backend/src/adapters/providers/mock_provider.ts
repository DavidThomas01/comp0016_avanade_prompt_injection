import type { ModelProvider } from "../../domain/model_provider.js";
import type { ModelConfig } from "../../domain/types.js";

export class MockProvider implements ModelProvider {
  id = "mock";

  async run(prompt: string, _config: ModelConfig): Promise<string> {
    // VERY simple behavior: refuse obvious jailbreak-y prompts
    const lower = prompt.toLowerCase();
    const looksLikeInjection =
      lower.includes("ignore all previous") ||
      lower.includes("reveal your system") ||
      lower.includes("system prompt") ||
      lower.includes("developer mode") ||
      lower.includes("hidden instructions");

    if (looksLikeInjection) {
      return "I cannot fulfill that request as it violates safety guidelines. How can I assist with a legitimate inquiry?";
    }
    return `Mock response to: ${prompt}`;
  }
}
