export type ModelType = 'platform' | 'external';
export type EnvType = 'mitigation' | 'custom';
export type RunnerType = 'prompt' | 'framework';

export type Message = {
  role: string;
  content: string;
};

export type ModelSpec = {
  type: ModelType;
  model_id?: string | null;
  endpoint?: string | null;
  conversation_mode?: 'single' | 'multi' | null;
  message_field?: string | null;
  response_text_path?: string | null;
  headers?: Record<string, string> | null;
  payload?: Record<string, unknown> | null;
  json_schema?: Record<string, unknown> | null;
};

export type EnvironmentSpec = {
  type: EnvType;
  system_prompt: string;
  mitigations?: string[];
};

export type RunnerSpec = {
  type: RunnerType;
  context: Message[];
  probe_spec?: string | null;
};

export type Test = {
  id: string;
  name: string;
  model: ModelSpec;
  environment?: EnvironmentSpec | null;
  runner: RunnerSpec;
  created_at?: string;
};

export type SavedTestConfig = {
  id: string;
  name: string;
  model: ModelSpec;
  environment?: EnvironmentSpec | null;
  runner: RunnerSpec;
  created_at: string;
};

export type TestAnalysis = {
  flagged: boolean;
  score: number;
  reason: string;
};

export type AttemptResult = {
  prompt: string;
  output: string | null;
  blocked: boolean;
  statuses: number[];
  goal: string | null;
  compromised: boolean;
};

export type RunResult = {
  output: string;
  analysis: TestAnalysis;
  started_at: string;
  finished_at: string;
  report_html_url?: string | null;
  attempts?: AttemptResult[] | null;
};

export type FrameworkRun = {
  run_id: string;
  probe_spec: string;
  started_at: string;
  finished_at: string;
  output: string;
  analysis: TestAnalysis;
  attempts: AttemptResult[];
  report_html_url?: string | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};
