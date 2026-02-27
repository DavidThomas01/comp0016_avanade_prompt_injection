import { ChatRole, StreamCallbacks, SSEDeltaData } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api';

export async function streamChatMessage(
  message: string,
  history: { role: ChatRole; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const event = parseSSEEvent(part);
        if (!event) continue;

        if (event.type === 'delta') {
          callbacks.onDelta?.(event.data as SSEDeltaData);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEEvent(raw: string): { type: string; data: unknown } | null {
  let eventType = '';
  let dataStr = '';

  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) {
      eventType = line.slice('event: '.length).trim();
    } else if (line.startsWith('data: ')) {
      dataStr = line.slice('data: '.length);
    }
  }

  if (!eventType || !dataStr) return null;

  try {
    return { type: eventType, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}
