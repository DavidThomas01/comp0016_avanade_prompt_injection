import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Send, RefreshCcw, User, Bot, Settings, Trash2 } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { MarkdownRenderer } from '../assistant/MarkdownRenderer';

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

const API_BASE = 'http://localhost:8080/api';

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

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
}

const makeId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

export function TestingPage() {
  // Tests state
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [modelType, setModelType] = useState<ModelType>('platform');
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0]?.id ?? 'gpt-5.2');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);
  const [promptOverride, setPromptOverride] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mitigation editor state
  const [editingMitigations, setEditingMitigations] = useState<string[]>([]);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  // Chat scroll ref
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load tests on mount
  useEffect(() => {
    const loadTests = async () => {
      try {
        const data = await apiGet<Test[]>('/tests');
        setTests(data || []);
      } catch (error) {
        console.error('Failed to load tests:', error);
      } finally {
        setLoadingTests(false);
      }
    };
    loadTests();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  const canCreateTest =
    newName.trim().length > 0 &&
    (modelType === 'platform'
      ? modelId.trim().length > 0
      : endpoint.trim().length > 0 && apiKey.trim().length > 0);

  const canRunTest = !!selectedTest && promptOverride.trim().length > 0 && !isLoading;

  const createTest = async () => {
    if (!canCreateTest) return;

    setIsLoading(true);
    try {
      const model: ModelSpec =
        modelType === 'platform'
          ? { type: 'platform', model_id: modelId }
          : {
              type: 'external',
              endpoint: endpoint.trim(),
              key: apiKey.trim(),
            };

      // Environment only for platform models
      let environment: EnvironmentSpec | null = null;
      if (modelType === 'platform') {
        const hasSystemPrompt = systemPrompt.trim().length > 0;
        const hasMitigations = selectedMitigations.length > 0;
        
        // Determine env type: system_prompt only if system prompt WITHOUT mitigations
        const envType: EnvType = (hasSystemPrompt && !hasMitigations) ? 'custom' : 'mitigation';
        
        environment = {
          type: envType,
          system_prompt: systemPrompt.trim(),
          mitigations: selectedMitigations,
        };
      }

      const runner: RunnerSpec = {
        type: 'prompt',
        context: [],
      };

      const newTest = await apiPost<Test>('/tests', {
        name: newName.trim(),
        model,
        ...(environment && { environment }),
        runner,
      });

      setTests([...tests, newTest]);
      setSelectedTest(newTest);
      setChatMessages([]);
      setRunResult(null);

      // Reset form
      setNewName('');
      setModelType('platform');
      setModelId(MODEL_OPTIONS[0]?.id ?? 'gpt-5.2');
      setEndpoint('');
      setApiKey('');
      setSystemPrompt('');
      setSelectedMitigations([]);
      setPromptOverride('');
    } catch (error) {
      console.error('Failed to create test:', error);
      alert('Failed to create test: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const runTest = async () => {
    if (!canRunTest || !selectedTest) return;

    const trimmed = promptOverride.trim();
    setPromptOverride('');
    
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: trimmed,
      pending: false,
    };

    setChatMessages(prev => [...prev, userMessage]);

    try {
      const response = await apiPost<RunResult>(`/tests/${selectedTest.id}/run`, {
        role: 'user',
        content: trimmed,
      });

      setRunResult(response);

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: response.output,
        pending: false,
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Test run failed:', error);
      const errorMessage: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pending: false,
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTest = async (testId: string) => {
    try {
      // Fetch fresh test data from backend
      const test = await apiGet<Test>(`/tests/${testId}`);
      
      setSelectedTest(test);
      // Load context messages from test (don't trigger any sends)
      const contextMessages: ChatMessage[] = (test.runner.context || []).map(msg => {
        const role = (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant';
        return {
          id: makeId(),
          role: role as 'user' | 'assistant',
          content: msg.content,
          pending: false,
        };
      });
      setChatMessages(contextMessages);
      setRunResult(null);
      setPromptOverride('');
      // Initialize mitigation editor with current test's mitigations
      setEditingMitigations(test.environment?.mitigations || []);
    } catch (error) {
      console.error('Failed to load test:', error);
    }
  };

  const deleteTest = async (testId: string) => {
    try {
      await apiDelete(`/tests/${testId}`);
      setTests(prev => prev.filter(t => t.id !== testId));
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
        setChatMessages([]);
        setRunResult(null);
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleEditMitigation = (id: string) => {
    setEditingMitigations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const confirmMitigationEdit = async () => {
    if (!selectedTest) return;
    
    try {
      setIsLoading(true);
      await apiPatch(`/tests/${selectedTest.id}`, {
        environment: {
          type: selectedTest.environment?.type || 'mitigation',
          system_prompt: selectedTest.environment?.system_prompt || '',
          mitigations: editingMitigations,
        },
      });
      
      // Fetch the updated test
      const updatedTest = await apiGet<Test>(`/tests/${selectedTest.id}`);
      setSelectedTest(updatedTest);
      setTests(tests.map(t => t.id === updatedTest.id ? updatedTest : t));
      setShowEditConfirm(false);
    } catch (error) {
      console.error('Failed to update mitigations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold gradient-text mb-2">Test Prompt Injection</h1>
          <p className="text-muted-foreground text-lg">
            Create tests and run them against different models with mitigations
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Test creation & list */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Test Form */}
            <div className="glass-strong p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold">Create Test</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Test Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., SQL Injection Attack"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model Type</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={modelType === 'platform'}
                      onChange={() => setModelType('platform')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Platform (OpenAI, Anthropic, etc.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={modelType === 'external'}
                      onChange={() => setModelType('external')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">External Model</span>
                  </label>
                </div>
              </div>

              {modelType === 'platform' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Select Model</label>
                  <select
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                  >
                    {MODEL_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Endpoint</label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={e => setEndpoint(e.target.value)}
                      placeholder="https://api.example.com/v1/..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                    />
                  </div>
                </>
              )}

              {modelType === 'platform' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">System Prompt (optional)</label>
                    <textarea
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      placeholder="You are a helpful assistant..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Mitigations (optional)</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {MITIGATION_OPTIONS.map(mit => (
                        <label key={mit.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMitigations.includes(mit.id)}
                            onChange={() => toggleMitigation(mit.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{mit.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={createTest}
                disabled={!canCreateTest || isLoading}
                className={cn(
                  'w-full px-4 py-2 rounded-lg font-medium transition-all',
                  (canCreateTest && !isLoading)
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                )}
              >
                {isLoading ? 'Creating...' : 'Create Test'}
              </button>
            </div>

            {/* Tests List */}
            {tests.length > 0 && (
              <div className="glass-strong p-6 rounded-xl space-y-3">
                <h3 className="font-semibold">Tests ({tests.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tests.map(test => (
                    <div key={test.id} className="flex gap-2 items-stretch">
                      <button
                        onClick={() => selectTest(test.id)}
                        className={cn(
                          'flex-1 text-left px-3 py-2 rounded-lg transition-all text-sm hover:opacity-75',
                          selectedTest?.id === test.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-background hover:bg-white/10 dark:hover:bg-white/5 text-foreground'
                        )}
                      >
                        <div className="font-medium truncate">{test.name}</div>
                        <div className="text-xs opacity-75">
                          {test.model.type === 'platform'
                            ? test.model.model_id
                            : 'External Model'}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTest(test.id);
                        }}
                        className="px-1 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Delete test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {loadingTests && (
              <div className="glass-strong p-6 rounded-xl text-center">
                <p className="text-sm text-muted-foreground">Loading tests...</p>
              </div>
            )}
          </div>

          {/* Right: Chat & Results */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTest && (
              <>
                {/* Chat Messages */}
                <div className="glass-strong p-6 rounded-xl">
                  <h2 className="text-lg font-semibold mb-4">Test Chat</h2>
                  <div ref={chatScrollRef} className="h-96 bg-background rounded-lg p-4 overflow-y-auto space-y-4 mb-4 border border-border">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Send a prompt to start the test
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-3',
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={cn(
                              'max-w-md px-4 py-3 rounded-lg border text-sm',
                              msg.role === 'user'
                                ? 'bg-orange-600 text-white border-orange-700 rounded-br-none'
                                : 'bg-white dark:bg-gray-900 text-foreground border-border rounded-bl-none'
                            )}
                          >
                            <div className="font-semibold mb-1 text-xs uppercase opacity-75">
                              {msg.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            {msg.role === 'assistant' ? (
                              <MarkdownRenderer content={msg.content} />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            )}
                            {msg.pending && <span className="animate-pulse"> ...</span>}
                          </div>
                          {msg.role === 'user' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-md px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 text-foreground border-border rounded-bl-none">
                          <div className="font-semibold mb-1 text-xs uppercase opacity-75">Assistant</div>
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promptOverride}
                      onChange={e => setPromptOverride(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && canRunTest) {
                          runTest();
                        }
                      }}
                      placeholder="Enter your test prompt..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                    />
                    <button
                      onClick={runTest}
                      disabled={!canRunTest}
                      className={cn(
                        'px-4 py-2 rounded-lg font-medium transition-all',
                        canRunTest
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Analysis Results */}
                {runResult && (
                  <div className="glass-strong p-6 rounded-xl space-y-4">
                    <h2 className="text-lg font-semibold">Analysis Results</h2>

                    <div
                      className={cn(
                        'p-4 rounded-lg flex items-start gap-3',
                        runResult.analysis.flagged
                          ? 'bg-red-500/10 dark:bg-red-500/20 border border-red-500/30'
                          : 'bg-green-500/10 dark:bg-green-500/20 border border-green-500/30'
                      )}
                    >
                      {runResult.analysis.flagged ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className={cn('font-semibold', runResult.analysis.flagged ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>
                          {runResult.analysis.flagged ? 'Prompt Injection Detected' : 'Safe Prompt'}
                        </div>
                        <div className="text-sm opacity-80 mt-1">{runResult.analysis.reason}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Risk Score</div>
                      <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            runResult.analysis.score > 0.7
                              ? 'bg-red-600'
                              : runResult.analysis.score > 0.4
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          )}
                          style={{
                            width: `${runResult.analysis.score * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(runResult.analysis.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!selectedTest && (
              <div className="glass-strong p-12 rounded-xl flex items-center justify-center min-h-96">
                <div className="text-center">
                  <RefreshCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Create or select a test to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showEditConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-xl p-6 max-w-sm w-full border border-white/60 dark:border-white/10">
              <h3 className="text-lg font-semibold mb-2">Update Mitigations?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will update the mitigation configuration for this test. Are you sure you want to proceed?
              </p>
              
              <div className="space-y-2 mb-6 max-h-48 overflow-y-auto p-3 bg-background rounded border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">New configuration:</p>
                {editingMitigations.length > 0 ? (
                  editingMitigations.map(id => {
                    const label = MITIGATION_OPTIONS.find(m => m.id === id)?.label || id;
                    return (
                      <div key={id} className="text-xs text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                        {label}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic">No mitigations selected</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditConfirm(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMitigationEdit}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all',
                    isLoading
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  )}
                >
                  {isLoading ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
