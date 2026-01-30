import { Router } from "express";
import { z } from "zod";
import type { RunService } from "../services/run_service.js";
import type { RunRepo } from "../repos/run_repo.js";

export function runsRouter(service: RunService, runsRepo: RunRepo) {
  const r = Router();

  r.post("/", async (req, res) => {
    const body = z.object({
      testId: z.string().min(1),
      promptOverride: z.string().optional(),
      activeMitigations: z.array(z.string()).optional(),
      modelConfigOverride: z.any().nullable().optional()
    }).parse(req.body);

    try {
      const run = await service.runAsync({
        testId: body.testId,
        promptOverride: body.promptOverride,
        activeMitigations: body.activeMitigations,
        modelConfigOverride: body.modelConfigOverride ?? null
      });
      res.status(201).json(run);
    } catch (e: any) {
      const msg = String(e?.message ?? "UNKNOWN");
      if (msg === "TEST_NOT_FOUND") return res.status(404).json({ error: "TEST_NOT_FOUND" });
      res.status(500).json({ error: "RUN_FAILED" });
    }
  });

  r.get("/", async (req, res) => {
    const testId = z.string().min(1).parse(req.query.testId);
    res.json(await runsRepo.listByTest(testId));
  });

  r.get("/:runId", async (req, res) => {
    const runId = z.string().min(1).parse(req.params.runId);
    const run = await runsRepo.getById(runId);
    if (!run) return res.status(404).json({ error: "RUN_NOT_FOUND" });
    res.json(run);
  });

  return r;
}
