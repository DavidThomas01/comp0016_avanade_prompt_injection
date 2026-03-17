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

export interface Model {
  id: string;
  label: string;
}

export interface GetModelsResponse {
  models: Model[];
}

export interface Mitigation {
  id: string;
  label: string;
  layer: string;
}

export interface GetMitigationsResponse {
  mitigations: Mitigation[];
}

const getApiBase = () => import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export async function getPromptMitigations(): Promise<PromptMitigation[]> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/prompt-enhancements/mitigations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch mitigations: HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchModels(): Promise<Model[]> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/models/`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data: GetModelsResponse = await response.json();
  return data.models;
}

export async function fetchMitigations(): Promise<Mitigation[]> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/mitigations/`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data: GetMitigationsResponse = await response.json();
  return data.mitigations;
}

export async function enhancePrompt(
  systemPrompt: string,
  selectedMitigationIds: string[],
  modelId: string = 'gpt-5-nano',
  maxRetries: number = 1
): Promise<PromptEnhancementResponse> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/prompt-enhancements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      selectedMitigationIds,
      modelId,
      maxRetries,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
