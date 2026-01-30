import { Router } from "express";
import { z } from "zod";
import type { TestService } from "../services/test_service.js";

type AsyncRoute = (req: any, res: any, next: any) => Promise<any> | any;

/**
 * Express v4 does not reliably catch async throws/rejections.
 * Wrap handlers so errors flow to the global error handler instead of crashing the process.
 */
function asyncHandler(fn: AsyncRoute) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function testsRouter(service: TestService) {
  const r = Router();

  r.get(
    "/",
    asyncHandler(async (req, res) => {
      const suiteIdParsed = z.string().min(1).safeParse(req.query.suiteId);
      if (!suiteIdParsed.success) {
        return res.status(400).json({
          error: "Invalid query",
          details: suiteIdParsed.error.issues,
        });
      }

      res.json(await service.listBySuite(suiteIdParsed.data));
    })
  );

  r.post(
    "/",
    asyncHandler(async (req, res) => {
      // Accept both `name` (backend canonical) and `title` (frontend field)
      const schema = z
        .object({
          suiteId: z.string().min(1),
          name: z.string().min(1).optional(),
          title: z.string().min(1).optional(),
          prompt: z.string().optional(),
          expectedBehavior: z.string().optional(),
          requiredMitigations: z.array(z.string()).optional(),
          modelConfig: z.record(z.any()).optional(),
        })
        .superRefine((val, ctx) => {
          if (!val.name && !val.title) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["name"],
              message: "Required",
            });
          }
        });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid payload",
          details: parsed.error.issues,
        });
      }

      const body = parsed.data;

      const created = await service.create({
        suiteId: body.suiteId,
        name: body.name ?? body.title ?? "", // superRefine guarantees one exists
        prompt: body.prompt,
        expectedBehavior: body.expectedBehavior,
        requiredMitigations: body.requiredMitigations,
        modelConfig: body.modelConfig,
      });

      res.status(201).json(created);
    })
  );

  r.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const idParsed = z.string().min(1).safeParse(req.params.id);
      if (!idParsed.success) {
        return res.status(400).json({
          error: "Invalid id",
          details: idParsed.error.issues,
        });
      }

      const ok = await service.deleteById(idParsed.data);
      if (!ok) {
        return res.status(404).json({ error: "Test not found" });
      }

      return res.status(204).send();
    })
  );

  return r;
}
