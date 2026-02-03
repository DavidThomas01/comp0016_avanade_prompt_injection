import type { ModelConfig } from "./types.js";

export interface ModelProvider {
  id: string;
  run(prompt: string, config: ModelConfig): Promise<string>;
}
