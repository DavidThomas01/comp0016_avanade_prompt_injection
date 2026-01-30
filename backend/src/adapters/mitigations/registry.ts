import type { Mitigation } from "../../domain/mitigation.js";

class NoopMitigation implements Mitigation {
  constructor(public id: string) {}

  applyInput(prompt: string) {
    return { text: prompt, notes: { applied: this.id } };
  }

  applyOutput(response: string) {
    return { text: response, notes: { applied: this.id } };
  }
}

// MVP: register known mitigation IDs, but keep them as no-ops for now.
// Later you can replace any specific mitigation with a real implementation.
export function getMitigationById(id: string): Mitigation | null {
  const known = new Set([
    "input-validation",
    "pattern-matching",
    "blocklist-filtering",
    "delimiter-tokens",
    "output-sanitization",
    "rate-limiting",
    "anomaly-detection"
  ]);

  if (!known.has(id)) return null;
  return new NoopMitigation(id);
}
