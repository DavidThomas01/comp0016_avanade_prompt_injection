import { Router } from "express";

export function modelsRouter() {
  const r = Router();

  // MVP: frontend can fetch this later to populate dropdown
  r.get("/", (_req, res) => {
    res.json([
      { id: "gpt-5", label: "GPT-5", provider: "openai" },
      { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
      { id: "claude-3.5", label: "Claude 3.5", provider: "anthropic" },
      { id: "gemini-1.5", label: "Gemini 1.5", provider: "google" }
    ]);
  });

  return r;
}
