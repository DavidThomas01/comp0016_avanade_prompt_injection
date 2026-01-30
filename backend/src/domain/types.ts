export type ModelConfig =
  | { mode: "existing"; provider: string; modelId: string }
  | { mode: "custom"; provider: string; modelId: string; apiKey: string };

export type Suite = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Test = {
  id: string;
  suiteId: string;
  name: string;
  prompt: string;
  expectedBehavior: string;
  requiredMitigations: string[];
  modelConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MitigationResult = {
  id: string;
  passed: boolean;
  notes?: Record<string, unknown>;
};

export type EvaluationResult = {
  passed: boolean;
  signals: Record<string, unknown>;
};

export type Run = {
  id: string;
  testId: string;
  suiteId: string;
  promptUsed: string;
  activeMitigations: string[];
  modelConfigUsed: Record<string, unknown>;
  modelResponse: string;
  passed: boolean;
  mitigationResults: MitigationResult[];
  signals: Record<string, unknown>;
  createdAt: string;
};
