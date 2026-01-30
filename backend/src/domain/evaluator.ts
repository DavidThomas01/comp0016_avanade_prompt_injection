import type { EvaluationResult } from "./types.js";

export interface Evaluator {
  evaluate(params: { prompt: string; response: string; expectedBehavior?: string }): EvaluationResult;
}
