import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Sparkles, Send, RefreshCcw } from 'lucide-react';

type ModelType = 'platform' | 'external';
type EnvType = 'mitigation' | 'custom';
type RunnerType = 'prompt' | 'framework';

type Message = {
  role: string;
  content: string;
};

type ModelSpec = {
  type: ModelType;
  model_id?: string | null;
  endpoint?: string | null;
  key?: string | null;
};

type EnvironmentSpec = {
  type: EnvType;
  system_prompt: string;
  mitigations: string[];
};

type RunnerSpec = {
  type: RunnerType;
  context: Message[];
};

type Test = {
  id: string;
  name: string;
  model: ModelSpec;
  environment?: EnvironmentSpec | null;
  runner: RunnerSpec;
  created_at?: string;
};

type TestAnalysis = {
  flagged: boolean;
  score: number;
  reason: string;
};

type RunResult = {
  output: string;
  analysis: TestAnalysis;
  started_at: string;
  finished_at: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE ?? 'http://localhost:8000/api';

const MODEL_OPTIONS = [
  { id: 'gpt-5.2', label: 'gpt-5.2' },
  { id: 'gpt-5.1', label: 'gpt-5.1' },
  { id: 'gpt-5-nano', label: 'gpt-5-nano' },
  { id: 'o4-nano', label: 'o4-nano' },
  { id: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
  { id: 'claude-haiku-4-5', label: 'claude-haiku-4-5' },
];

const MITIGATION_OPTIONS = [
  { id: 'delimiter_tokens', label: 'Delimiter Tokens' },
  { id: 'input_validation', label: 'Input Validation' },
  { id: 'pattern_matching', label: 'Pattern Matching' },
  { id: 'blocklist_filtering', label: 'Blocklist Filtering' },
  { id: 'output_sanitization', label: 'Output Sanitization' },
  { id: 'anomaly_detection', label: 'Anomaly Detection' },
];

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const makeId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

export function TestingPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [chatByTestId, setChatByTestId] = useState<Record<string, ChatMessage[]>>({});
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [newName, setNewName] = useState('');
  const [modelType, setModelType] = useState<ModelType>('platform');
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0]?.id ?? 'gpt-5.2');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [envType, setEnvType] = useState<EnvType>('mitigation');
  const [systemPrompt, setSystemPrompt] = useState('You are a careful, secure assistant.');
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);
  const [promptInput, setPromptInput] = useState('');

  const selectedTest = useMemo(
    () => tests.find(t => t.id === selectedTestId) ?? null,
    [tests, selectedTestId]
  );

  const selectedChat = selectedTestId ? chatByTestId[selectedTestId] ?? [] : [];

  const refreshTests = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<Test[]>('/tests');
      setTests(data);
      setSelectedTestId(prev => prev ?? data[0]?.id ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTests().catch(console.error);
  }, []);

  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canCreateTest =
    newName.trim().length > 0 &&
    (modelType === 'platform' ? modelId.trim().length > 0 : endpoint.trim() && apiKey.trim()) &&
    (modelType === 'external' || systemPrompt.trim().length > 0);

  const createTest = async () => {
    if (!canCreateTest) return;
    setIsLoading(true);
    try {
      const model: ModelSpec =
        modelType === 'platform'
          ? { type: 'platform', model_id: modelId }
          : { type: 'external', endpoint: endpoint.trim(), key: apiKey.trim() };

      const environment: EnvironmentSpec | null =
        modelType === 'platform'
          ? {
              type: envType,
              system_prompt: systemPrompt.trim(),
              mitigations: envType === 'mitigation' ? selectedMitigations : [],
            }
          : null;

      const runner: RunnerSpec = {
        type: 'prompt',
        context: [],
      };

      const created = await apiPost<Test>('/tests', {
        name: newName.trim(),
        model,
        environment,
        runner,
      });

      setTests(prev => [created, ...prev]);
      setSelectedTestId(created.id);
      setRunResult(null);
      setNewName('');
    } finally {
      setIsLoading(false);
    }
  };

  const runTest = async () => {
    if (!selectedTest || promptInput.trim().length === 0) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: promptInput.trim(),
    };

    const pendingMessage: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      content: 'Running test...',
      pending: true,
    };

    setChatByTestId(prev => {
      const next = { ...prev };
      const existing = next[selectedTest.id] ?? [];
      next[selectedTest.id] = [...existing, userMessage, pendingMessage];
      return next;
    });

    setPromptInput('');
    setIsRunning(true);
    try {
      const result = await apiPost<RunResult>(`/tests/${selectedTest.id}/run`, {
        role: 'user',
        content: userMessage.content,
      });

      setRunResult(result);

      setChatByTestId(prev => {
        const next = { ...prev };
        const existing = next[selectedTest.id] ?? [];
        next[selectedTest.id] = existing.map(msg =>
          msg.id === pendingMessage.id
            ? { id: msg.id, role: 'assistant', content: result.output, pending: false }
            : msg
        );
        return next;
      });
    } catch (error) {
      setChatByTestId(prev => {
        const next = { ...prev };
        const existing = next[selectedTest.id] ?? [];
        next[selectedTest.id] = existing.map(msg =>
          msg.id === pendingMessage.id
            ? {
                id: msg.id,
                role: 'assistant',
                content: 'Run failed. Check backend logs for details.',
                pending: false,
              }
            : msg
        );
        return next;
      });
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const analysisPassed = runResult ? !runResult.analysis.flagged : null;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-emerald-50 relative overflow-hidden"
      style={{ fontFamily: '"Fraunces", "Iowan Old Style", "Palatino", serif' }}
    >
      <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-10">
        <header className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-amber-700">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm uppercase tracking-[0.2em]">Test Runner Demo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
            Build a test, run it, and review the analysis in real time.
          </h1>
          <p className="text-slate-600 max-w-2xl">
            Create a test configuration, then chat with the model to see how it responds and
            whether the response is flagged as a jailbreak or prompt injection.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Create Test</h2>
                <button
                  type="button"
                  onClick={refreshTests}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Test name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Injection defense baseline"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">Model type</label>
                  <select
                    value={modelType}
                    onChange={e => setModelType(e.target.value as ModelType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="platform">Platform model</option>
                    <option value="external">External model</option>
                  </select>
                </div>

                {modelType === 'platform' ? (
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Model id</label>
                    <select
                      value={modelId}
                      onChange={e => setModelId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      {MODEL_OPTIONS.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Endpoint</label>
                      <input
                        value={endpoint}
                        onChange={e => setEndpoint(e.target.value)}
                        placeholder="https://api.example.com/v1/chat"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">API key</label>
                      <input
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {modelType === 'platform' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Environment type</label>
                      <select
                        value={envType}
                        onChange={e => setEnvType(e.target.value as EnvType)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="mitigation">Mitigation stack</option>
                        <option value="custom">Custom system prompt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-700 mb-1">System prompt</label>
                      <textarea
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    {envType === 'mitigation' && (
                      <div>
                        <label className="block text-sm text-slate-700 mb-2">Mitigations</label>
                        <div className="grid grid-cols-2 gap-2">
                          {MITIGATION_OPTIONS.map(mitigation => (
                            <button
                              key={mitigation.id}
                              type="button"
                              onClick={() => toggleMitigation(mitigation.id)}
                              className={`rounded-xl border px-3 py-2 text-xs text-left transition ${
                                selectedMitigations.includes(mitigation.id)
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              {mitigation.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={createTest}
                  disabled={!canCreateTest || isLoading}
                  className="w-full rounded-xl bg-slate-900 text-white py-2 text-sm disabled:opacity-50"
                >
                  Create Test
                </button>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Saved Tests</h3>
              <div className="space-y-2">
                {tests.length === 0 && (
                  <div className="text-sm text-slate-500">No tests yet. Create one to begin.</div>
                )}
                {tests.map(test => (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => {
                      setSelectedTestId(test.id);
                      setRunResult(null);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      test.id === selectedTestId
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <div className="font-medium">{test.name}</div>
                    <div className="text-xs opacity-80">
                      {test.model.type === 'platform' ? test.model.model_id : 'External model'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Test Chat</h2>
                  <p className="text-sm text-slate-500">
                    {selectedTest ? selectedTest.name : 'Select a test to begin.'}
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  {selectedTest ? `Runner: ${selectedTest.runner.type}` : null}
                </div>
              </div>

              <div className="h-[360px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                {selectedChat.length === 0 && (
                  <div className="text-sm text-slate-500">
                    Start by sending a prompt. Your conversation will appear here.
                  </div>
                )}
                {selectedChat.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        message.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : message.pending
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <input
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  placeholder="Type a prompt to run against the test"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={runTest}
                  disabled={!selectedTest || promptInput.trim().length === 0 || isRunning}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Run Test
                </button>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Analysis</h3>
              {!runResult && (
                <div className="text-sm text-slate-500">
                  Run a prompt to see the analysis summary.
                </div>
              )}
              {runResult && (
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    analysisPassed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {analysisPassed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {analysisPassed ? 'Pass' : 'Fail'}
                  </div>
                  <div className="text-sm mt-2">Score: {runResult.analysis.score.toFixed(2)}</div>
                  <div className="text-sm mt-2">{runResult.analysis.reason}</div>
                  <div className="text-xs mt-3 opacity-80">
                    Started: {runResult.started_at} | Finished: {runResult.finished_at}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
