export function redactModelConfig(config: unknown): unknown {
  // Remove apiKey if present
  if (!config || typeof config !== "object") return config;
  const c = config as Record<string, unknown>;
  const { apiKey, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
