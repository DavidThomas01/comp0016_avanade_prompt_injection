// backend/src/server.ts
import { ZodError } from "zod";
import { getConfig } from "./config.js";
import { openDb, ensureSchema } from "./db/index.js";
import { createApp } from "./app.js";

const cfg = getConfig();
const db = openDb(cfg.sqlitePath);

await ensureSchema(db);

const app = createApp({ db, corsOrigin: cfg.corsOrigin });

/**
 * Global error handler (must be registered AFTER routes).
 * Prevents the backend from crashing on validation / runtime errors.
 */
app.use((err: unknown, req: any, res: any, next: any) => {
  // eslint-disable-next-line no-console
  console.error("[backend] unhandled error", err);

  // Zod validation errors -> 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request",
      details: err.issues,
    });
  }

  // Bad JSON body -> 400
  // (express.json() throws a SyntaxError on invalid JSON)
  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: "Invalid JSON",
    });
  }

  return res.status(500).json({ error: "Internal server error" });
});

app.listen(cfg.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${cfg.port}`);
});
