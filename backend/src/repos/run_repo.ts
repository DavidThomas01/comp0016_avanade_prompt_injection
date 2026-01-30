import type { SqliteDb } from "../db/index.js";
import { all, get, run } from "../db/index.js";
import type { Run } from "../domain/types.js";

type RunRow = {
  id: string;
  test_id: string;
  suite_id: string;
  prompt_used: string;
  active_mitigations_json: string;
  model_config_used_json: string;
  model_response: string;
  passed: number;
  mitigation_results_json: string;
  signals_json: string;
  created_at: string;
};

export class RunRepo {
  constructor(private db: SqliteDb) {}

  async listByTest(testId: string): Promise<Run[]> {
    const rows = await all<RunRow>(
      this.db,
      "SELECT * FROM runs WHERE test_id = ? ORDER BY created_at DESC",
      [testId]
    );
    return rows.map(rowToRun);
  }

  async getById(runId: string): Promise<Run | null> {
    const r = await get<RunRow>(this.db, "SELECT * FROM runs WHERE id = ?", [runId]);
    if (!r) return null;
    return rowToRun(r);
  }

  async create(params: {
    id: string;
    testId: string;
    suiteId: string;
    promptUsed: string;
    activeMitigations: string[];
    modelConfigUsed: Record<string, unknown>;
    modelResponse: string;
    passed: boolean;
    mitigationResults: any[];
    signals: Record<string, unknown>;
    now: string;
  }): Promise<Run> {
    await run(
      this.db,
      `INSERT INTO runs
       (id, test_id, suite_id, prompt_used, active_mitigations_json, model_config_used_json, model_response, passed,
        mitigation_results_json, signals_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.id,
        params.testId,
        params.suiteId,
        params.promptUsed,
        JSON.stringify(params.activeMitigations ?? []),
        JSON.stringify(params.modelConfigUsed ?? {}),
        params.modelResponse,
        params.passed ? 1 : 0,
        JSON.stringify(params.mitigationResults ?? []),
        JSON.stringify(params.signals ?? {}),
        params.now
      ]
    );

    return {
      id: params.id,
      testId: params.testId,
      suiteId: params.suiteId,
      promptUsed: params.promptUsed,
      activeMitigations: params.activeMitigations ?? [],
      modelConfigUsed: params.modelConfigUsed ?? {},
      modelResponse: params.modelResponse,
      passed: params.passed,
      mitigationResults: params.mitigationResults ?? [],
      signals: params.signals ?? {},
      createdAt: params.now
    };
  }
}

function rowToRun(r: RunRow): Run {
  return {
    id: r.id,
    testId: r.test_id,
    suiteId: r.suite_id,
    promptUsed: r.prompt_used,
    activeMitigations: safeJsonArray(r.active_mitigations_json),
    modelConfigUsed: safeJsonObject(r.model_config_used_json),
    modelResponse: r.model_response,
    passed: Boolean(r.passed),
    mitigationResults: safeJsonAnyArray(r.mitigation_results_json),
    signals: safeJsonObject(r.signals_json),
    createdAt: r.created_at
  };
}

function safeJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeJsonAnyArray(value: unknown): any[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
