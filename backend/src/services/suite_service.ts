import type { SuiteRepo } from "../repos/suite_repo.js";
import type { Suite } from "../domain/types.js";
import { generateId } from "../utils/ids.js";

export class SuiteService {
  constructor(private suites: SuiteRepo) {}

  async list(): Promise<Suite[]> {
    return this.suites.list();
  }

  async create(params: { name: string; description?: string }): Promise<Suite> {
    const now = new Date().toISOString();
    return this.suites.create({
      id: generateId("suite"),
      name: params.name,
      description: params.description ?? "",
      now
    });
  }

  /**
   * Delete a suite and all dependent tests/runs.
   * Returns the deleted suite (for UI feedback) or null if not found.
   */
  async delete(suiteId: string): Promise<Suite | null> {
    const existing = await this.suites.getById(suiteId);
    if (!existing) return null;
    await this.suites.deleteById(suiteId);
    return existing;
  }
}
