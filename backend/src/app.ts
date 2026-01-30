// backend/src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import type { SqliteDb } from "./db/index.js";

import { SuiteRepo } from "./repos/suite_repo.js";
import { TestRepo } from "./repos/test_repo.js";
import { RunRepo } from "./repos/run_repo.js";

import { SuiteService } from "./services/suite_service.js";
import { TestService } from "./services/test_service.js";
import { RunService } from "./services/run_service.js";

import { suitesRouter } from "./routes/suites.js";
import { testsRouter } from "./routes/tests.js";
import { runsRouter } from "./routes/runs.js";
import { modelsRouter } from "./routes/models.js";

import { MockProvider } from "./adapters/providers/mock_provider.js";
import { SimpleEvaluator } from "./adapters/evaluators/simple_evaluator.js";

export function createApp(params: { db: SqliteDb; corsOrigin: string }) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: params.corsOrigin }));
  app.use(express.json({ limit: "256kb" }));
  app.use(morgan("dev"));

  const suiteRepo = new SuiteRepo(params.db);
  const testRepo = new TestRepo(params.db);
  const runRepo = new RunRepo(params.db);

  const suiteService = new SuiteService(suiteRepo);
  const testService = new TestService(testRepo, suiteRepo);

  const provider = new MockProvider();
  const evaluator = new SimpleEvaluator();
  const runService = new RunService(runRepo, testRepo, provider, evaluator);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/suites", suitesRouter(suiteService));
  app.use("/api/tests", testsRouter(testService));
  app.use("/api/runs", runsRouter(runService, runRepo));
  app.use("/api/models", modelsRouter());

  return app;
}
