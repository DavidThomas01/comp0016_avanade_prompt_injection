import { useEffect, useState } from 'react';

export function useRotatingText(
  messages: string[],
  intervalMs: number,
  active: boolean,
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [active, messages.length, intervalMs]);

  return messages[index];
}
