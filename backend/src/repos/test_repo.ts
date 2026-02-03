import type { SqliteDb } from "../db/index.js";
import { all, get, run } from "../db/index.js";
import type { Test } from "../domain/types.js";

type TestRow = {
  id: string;
  suite_id: string;
  name: string;
  prompt: string;
  expected_behavior: string;
  required_mitigations_json: string;
  model_config_json: string;
  created_at: string;
  updated_at: string;
};

export class TestRepo {
  constructor(private db: SqliteDb) {}

  async listBySuite(suiteId: string): Promise<Test[]> {
    const rows = await all<TestRow>(
      this.db,
      "SELECT * FROM tests WHERE suite_id = ? ORDER BY created_at ASC",
      [suiteId]
    );
    return rows.map(rowToTest);
  }

  async getById(id: string): Promise<Test | null> {
    const r = await get<TestRow>(this.db, "SELECT * FROM tests WHERE id = ?", [id]);
    if (!r) return null;
    return rowToTest(r);
  }

  async create(params: {
    id: string;
    suiteId: string;
    name: string;
    prompt: string;
    expectedBehavior: string;
    requiredMitigations: string[];
    modelConfig: Record<string, unknown>;
    now: string;
  }): Promise<Test> {
    await run(
      this.db,
      `INSERT INTO tests
       (id, suite_id, name, prompt, expected_behavior, required_mitigations_json, model_config_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.id,
        params.suiteId,
        params.name,
        params.prompt,
        params.expectedBehavior,
        JSON.stringify(params.requiredMitigations ?? []),
        JSON.stringify(params.modelConfig ?? {}),
        params.now,
        params.now,
      ]
    );

    return {
      id: params.id,
      suiteId: params.suiteId,
      name: params.name,
      prompt: params.prompt,
      expectedBehavior: params.expectedBehavior,
      requiredMitigations: params.requiredMitigations ?? [],
      modelConfig: params.modelConfig ?? {},
      createdAt: params.now,
      updatedAt: params.now,
    };
  }

  /**
   * Deletes a test by id.
   * Returns true if a row existed and was deleted, false if not found.
   *
   * Note: our db.run() helper does not expose `changes`, so we check existence first.
   */
  async deleteById(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await run(this.db, "DELETE FROM tests WHERE id = ?", [id]);
    return true;
  }
}

function rowToTest(r: TestRow): Test {
  return {
    id: r.id,
    suiteId: r.suite_id,
    name: r.name,
    prompt: r.prompt ?? "",
    expectedBehavior: r.expected_behavior ?? "",
    requiredMitigations: safeJsonArray(r.required_mitigations_json),
    modelConfig: safeJsonObject(r.model_config_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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

function safeJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
