import type { RunRepo } from "../repos/run_repo.js";
import type { TestRepo } from "../repos/test_repo.js";
import type { ModelProvider } from "../domain/model_provider.js";
import type { Evaluator } from "../domain/evaluator.js";
import type { ModelConfig, Run, MitigationResult } from "../domain/types.js";

import { generateId } from "../utils/ids.js";
import { redactModelConfig } from "../utils/redact.js";
import { getMitigationById } from "../adapters/mitigations/registry.js";

export class RunService {
  constructor(
    private runs: RunRepo,
    private tests: TestRepo,
    private provider: ModelProvider,
    private evaluator: Evaluator
  ) {}

  async runAsync(params: {
    testId: string;
    promptOverride?: string;
    activeMitigations?: string[];
    modelConfigOverride?: ModelConfig | null;
  }): Promise<Run> {
    const test = await this.tests.getById(params.testId);
    if (!test) throw new Error("TEST_NOT_FOUND");

    const now = new Date().toISOString();
    const promptUsed = (params.promptOverride ?? test.prompt ?? "").trim();

    // If caller doesn’t provide, default to the test’s configured mitigations
    const activeMitigations = params.activeMitigations ?? test.requiredMitigations ?? [];

    // 1) Apply input mitigations (MVP: no-op but structured)
    const mitigationResults: MitigationResult[] = [];
    let promptAfter = promptUsed;

    for (const mid of activeMitigations) {
      const m = getMitigationById(mid);
      if (!m) continue;

      const res = m.applyInput(promptAfter);
      promptAfter = res.text;

      mitigationResults.push({
        id: mid,
        passed: true,
        notes: res.notes ?? {}
      });
    }

    // 2) Resolve model config (override > test stored config)
    const modelConfig = (params.modelConfigOverride ??
      (test.modelConfig as unknown as ModelConfig)) as ModelConfig;

    // 3) Call model provider
    const responseRaw = await this.provider.run(promptAfter, modelConfig);

    // 4) Apply output mitigations (MVP: no-op but structured)
    let responseAfter = responseRaw;
    for (const mid of activeMitigations) {
      const m = getMitigationById(mid);
      if (!m) continue;
      const res = m.applyOutput(responseAfter);
      responseAfter = res.text;
    }

    // 5) Evaluate
    const evalRes = this.evaluator.evaluate({
      prompt: promptUsed,
      response: responseAfter,
      expectedBehavior: test.expectedBehavior
    });

    // 6) Persist run (NEVER persist apiKey)
    const modelConfigUsed = redactModelConfig(modelConfig) as Record<string, unknown>;

    return await this.runs.create({
      id: generateId("run"),
      testId: test.id,
      suiteId: test.suiteId,
      promptUsed,
      activeMitigations,
      modelConfigUsed,
      modelResponse: responseAfter,
      passed: evalRes.passed,
      mitigationResults,
      signals: evalRes.signals,
      now
    });
  }
}
