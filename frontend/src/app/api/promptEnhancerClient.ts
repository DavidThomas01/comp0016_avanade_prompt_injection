export interface PromptEnhancementResponse {
  id: string;
  originalPrompt: string;
  improvedPrompt: string;
  enhancedPrompt: string;
  selectedMitigationIds: string[];
  verificationData: {
    intent_preserved: boolean;
    all_mitigations_present: boolean;
    unintended_changes: boolean;
    coherent: boolean;
    missing_mitigations: string[];
    issues: string[];
    verdict: 'PASS' | 'FAIL';
    explanation: string;
  };
  modelId: string;
  attempts: number;
  createdAt: string;
}

export interface PromptMitigation {
  id: string;
  name: string;
  description: string;
}

export async function getPromptMitigations(): Promise<PromptMitigation[]> {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
  const response = await fetch(`${apiBase}/prompt-enhancements/mitigations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch mitigations: HTTP ${response.status}`);
  }

  return response.json();
}

export async function enhancePrompt(
  systemPrompt: string,
  selectedMitigationIds: string[],
  maxRetries: number = 3
): Promise<PromptEnhancementResponse> {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
  const response = await fetch(`${apiBase}/prompt-enhancements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      selectedMitigationIds,
      modelId: 'gpt-5-nano',
      maxRetries,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
