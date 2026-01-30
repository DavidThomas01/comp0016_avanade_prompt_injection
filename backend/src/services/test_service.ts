import type { TestRepo } from "../repos/test_repo.js";
import type { SuiteRepo } from "../repos/suite_repo.js";
import type { Test } from "../domain/types.js";
import { generateId } from "../utils/ids.js";

export class TestService {
  constructor(private tests: TestRepo, private suites: SuiteRepo) {}

  async listBySuite(suiteId: string): Promise<Test[]> {
    return this.tests.listBySuite(suiteId);
  }

  async create(params: {
    suiteId: string;
    name: string;
    prompt?: string;
    expectedBehavior?: string;
    requiredMitigations?: string[];
    modelConfig?: Record<string, unknown>;
  }): Promise<Test> {
    const suite = await this.suites.getById(params.suiteId);
    if (!suite) throw new Error("SUITE_NOT_FOUND");

    const now = new Date().toISOString();
    return this.tests.create({
      id: generateId("test"),
      suiteId: params.suiteId,
      name: params.name,
      prompt: params.prompt ?? "",
      expectedBehavior: params.expectedBehavior ?? "",
      requiredMitigations: params.requiredMitigations ?? [],
      modelConfig: params.modelConfig ?? {},
      now,
    });
  }

  async deleteById(id: string): Promise<boolean> {
    return this.tests.deleteById(id);
  }
}
