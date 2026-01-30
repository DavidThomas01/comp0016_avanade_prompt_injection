import type { SqliteDb } from "../db/index.js";
import { all, get, run } from "../db/index.js";
import type { Suite } from "../domain/types.js";

type SuiteRow = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export class SuiteRepo {
  constructor(private db: SqliteDb) {}

  async list(): Promise<Suite[]> {
    const rows = await all<SuiteRow>(this.db, "SELECT * FROM suites ORDER BY created_at ASC");
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async create(params: { id: string; name: string; description: string; now: string }): Promise<Suite> {
    await run(
      this.db,
      `INSERT INTO suites (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [params.id, params.name, params.description, params.now, params.now]
    );

    return {
      id: params.id,
      name: params.name,
      description: params.description,
      createdAt: params.now,
      updatedAt: params.now
    };
  }

  async getById(id: string): Promise<Suite | null> {
    const r = await get<SuiteRow>(this.db, "SELECT * FROM suites WHERE id = ?", [id]);
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /**
   * Delete a suite (and all dependent tests/runs via FK ON DELETE CASCADE).
   *
   * NOTE: Callers should check existence first if they need a 404.
   */
  async deleteById(id: string): Promise<void> {
    await run(this.db, "DELETE FROM suites WHERE id = ?", [id]);
  }
}
