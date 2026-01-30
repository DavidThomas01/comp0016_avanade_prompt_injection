import { Router } from "express";
import { z } from "zod";
import type { SuiteService } from "../services/suite_service.js";

export function suitesRouter(service: SuiteService) {
  const r = Router();

  r.get("/", async (_req, res) => {
    res.json(await service.list());
  });

  r.post("/", async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
      .parse(req.body);

    const created = await service.create(body);
    res.status(201).json(created);
  });

  /**
   * DELETE /api/suites/:suiteId?confirm=true
   *
   * We require an explicit confirm flag so the frontend can prompt the user
   * before issuing the destructive request.
   */
  r.delete("/:suiteId", async (req, res) => {
    const suiteId = z.string().min(1).parse(req.params.suiteId);

    const confirm = z.union([z.literal("true"), z.literal("1")]).optional().parse(req.query.confirm);

    if (!confirm) {
      return res.status(400).json({
        error: "Confirmation required",
        message: "Pass ?confirm=true (or ?confirm=1) to delete a suite.",
      });
    }

    const deleted = await service.delete(suiteId);
    if (!deleted) return res.status(404).json({ error: "Suite not found" });

    return res.status(200).json({
      ok: true,
      deleted,
    });
  });

  return r;
}
