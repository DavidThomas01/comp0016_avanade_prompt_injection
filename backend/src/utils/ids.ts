export function generateId(prefix: string): string {
  // Node 18+ supports crypto.randomUUID
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;

  // Fallback
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
