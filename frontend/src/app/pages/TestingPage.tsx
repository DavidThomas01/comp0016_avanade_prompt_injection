import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Download,
  Plus,
  RefreshCcw,
  Send,
  Trash2,
  User,
} from 'lucide-react';

import { MarkdownRenderer } from '../assistant/MarkdownRenderer';
import { useFetchModelsAndMitigations } from '../hooks/useFetchModelsAndMitigations';
import { exportTestPdf } from '../lib/pdf';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import type {
  ChatMessage,
  EnvironmentSpec,
  ModelSpec,
  ModelType,
  RunResult,
  RunnerType,
  Test,
} from '../types/testing';

const LOADING_MESSAGES = [
  'Sending prompt to the model...',
  'Waiting for the model response...',
  'Processing output...',
  'Running injection analysis...',
  'Evaluating response against mitigations...',
  'Scoring risk indicators...',
  'Almost done...',
];

const LOADING_INTERVAL_MS = 3200;
const API_BASE = 'http://localhost:8080/api';

type ConversationMode = 'single' | 'multi';

const makeId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

function useRotatingMessage(active: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, LOADING_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active]);

  return LOADING_MESSAGES[index];
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

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

function parseHeaders(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(`Invalid header line: "${line}". Use "Header-Name: value" format.`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      throw new Error(`Invalid header line: "${line}". Header name and value are required.`);
    }

    parsed[key] = value;
  }

  return parsed;
}

function parsePayload(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Payload must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function inferJsonSchemaFromValue(value: unknown): Record<string, unknown> {
  if (value === null) return { type: 'null' };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} };
    return { type: 'array', items: inferJsonSchemaFromValue(value[0]) };
  }

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return { type: valueType };
  }

  if (valueType === 'object') {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, nestedValue] of Object.entries(obj)) {
      properties[key] = inferJsonSchemaFromValue(nestedValue);
      required.push(key);
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: true,
    };
  }

  return { type: 'string' };
}

function buildJsonSchemaFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return inferJsonSchemaFromValue(payload);
}

export function TestingPage() {
  const { models, mitigations, isLoading: isLoadingData, error: dataError } = useFetchModelsAndMitigations();

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [promptOverride, setPromptOverride] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [newName, setNewName] = useState('');
  const [modelType, setModelType] = useState<ModelType>('platform');
  const [modelId, setModelId] = useState('');
  const [runnerType, setRunnerType] = useState<RunnerType>('prompt');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);

  const [endpoint, setEndpoint] = useState('');
  const [conversationMode, setConversationMode] = useState<ConversationMode>('single');
  const [messageFieldName, setMessageFieldName] = useState('input');
  const [headersText, setHeadersText] = useState('Content-Type: application/json');
  const [payloadText, setPayloadText] = useState('{\n  "input": ""\n}');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadingMessage = useRotatingMessage(isRunning);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (models.length > 0 && !modelId) {
      setModelId(models[0].id);
    }
  }, [models, modelId]);

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

    void loadTests();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isRunning]);

  const canCreateTest =
    newName.trim().length > 0 &&
    (modelType === 'platform'
      ? modelId.trim().length > 0
      : endpoint.trim().length > 0 && messageFieldName.trim().length > 0);

  const canRunTest = !!selectedTest && promptOverride.trim().length > 0 && !isRunning;

  const resetCreateForm = () => {
    setNewName('');
    setModelType('platform');
    setModelId(models.length > 0 ? models[0].id : '');
    setRunnerType('prompt');
    setSystemPrompt('');
    setSelectedMitigations([]);
    setEndpoint('');
    setConversationMode('single');
    setMessageFieldName('input');
    setHeadersText('Content-Type: application/json\nAuthorization: Bearer <YOUR_SECRET_KEY>');
    setPayloadText('{\n  "input": ""\n}');
    setCreateError(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id],
    );
  };

  const createTest = async () => {
    if (!canCreateTest) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const parsedPayload = modelType === 'external' ? parsePayload(payloadText) : null;

      const model: ModelSpec =
        modelType === 'platform'
          ? { type: 'platform', model_id: modelId }
          : {
              type: 'external',
              endpoint: endpoint.trim(),
              conversation_mode: conversationMode,
              message_field: messageFieldName.trim(),
              headers: parseHeaders(headersText),
              payload: parsedPayload,
              json_schema: parsedPayload ? buildJsonSchemaFromPayload(parsedPayload) : null,
            };

      let environment: EnvironmentSpec | undefined;
      if (modelType === 'platform' && runnerType === 'prompt') {
        const hasSystemPrompt = systemPrompt.trim().length > 0;
        const hasMitigations = selectedMitigations.length > 0;

        environment = {
          type: hasSystemPrompt && !hasMitigations ? 'custom' : 'mitigation',
          system_prompt: systemPrompt.trim(),
          mitigations: selectedMitigations,
        };
      }

      const newTest = await apiPost<Test>('/tests', {
        name: newName.trim(),
        model,
        runner: {
          type: runnerType,
          context: [],
        },
        ...(environment ? { environment } : {}),
      });

      setTests(prev => [...prev, newTest]);
      setSelectedTest(newTest);
      setChatMessages([]);
      setRunResult(null);
      setPromptOverride('');
      setShowCreateModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setCreateError(message);
      console.error('Failed to create test:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectTest = async (testId: string) => {
    try {
      const test = await apiGet<Test>(`/tests/${testId}`);
      setSelectedTest(test);

      const contextMessages: ChatMessage[] = (test.runner.context || []).map(msg => {
        const role = msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'assistant';
        return {
          id: makeId(),
          role,
          content: msg.content,
          pending: false,
        };
      });

      setChatMessages(contextMessages);
      setRunResult(null);
      setPromptOverride('');
    } catch (error) {
      console.error('Failed to load test:', error);
    }
  };

  const deleteTest = async (testId: string) => {
    try {
      await apiDelete(`/tests/${testId}`);
      setTests(prev => prev.filter(test => test.id !== testId));
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
        setChatMessages([]);
        setRunResult(null);
      }
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  const runTest = async () => {
    if (!canRunTest || !selectedTest) return;

    const trimmedPrompt = promptOverride.trim();
    setPromptOverride('');

    setIsRunning(true);
    setChatMessages(prev => [
      ...prev,
      {
        id: makeId(),
        role: 'user',
        content: trimmedPrompt,
        pending: false,
      },
    ]);

    try {
      const response = await apiPost<RunResult>(`/tests/${selectedTest.id}/run`, {
        role: 'user',
        content: trimmedPrompt,
      });

      setRunResult(response);
      setChatMessages(prev => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: response.output,
          pending: false,
        },
      ]);
    } catch (error) {
      setChatMessages(prev => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          pending: false,
        },
      ]);
      console.error('Test run failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedTest) return;

    setExportingPdf(true);
    try {
      await exportTestPdf(
        selectedTest,
        chatMessages,
        runResult,
        mitigations.map(mitigation => ({ id: mitigation.id, label: mitigation.label })),
      );
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExportingPdf(false);
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
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-strong p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold">Tests</h2>
              <button
                onClick={openCreateModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Test
              </button>

              {loadingTests && (
                <p className="text-sm text-muted-foreground text-center py-2">Loading tests...</p>
              )}

              {!loadingTests && tests.length === 0 && (
                <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground text-center">
                  No tests yet. Create one to get started.
                </div>
              )}

              {tests.length > 0 && (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {tests.map(test => (
                    <div key={test.id} className="flex gap-2 items-stretch">
                      <button
                        onClick={() => selectTest(test.id)}
                        className={cn(
                          'flex-1 text-left px-3 py-2 rounded-lg transition-all text-sm hover:opacity-75',
                          selectedTest?.id === test.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-background hover:bg-white/10 dark:hover:bg-white/5 text-foreground',
                        )}
                      >
                        <div className="font-medium truncate">{test.name}</div>
                        <div className="text-xs opacity-75 truncate">
                          {test.model.type === 'platform' ? test.model.model_id || 'Platform model' : 'External model'}
                        </div>
                      </button>
                      <button
                        onClick={event => {
                          event.stopPropagation();
                          void deleteTest(test.id);
                        }}
                        className="px-1 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Delete test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedTest ? (
              <>
                <div className="glass-strong p-6 rounded-xl">
                  <button
                    onClick={() => setShowConfig(prev => !prev)}
                    className="w-full inline-flex items-center justify-between text-left"
                  >
                    <div>
                      <h2 className="text-lg font-semibold">Configuration</h2>
                      <p className="text-sm text-muted-foreground">Current test setup</p>
                    </div>
                    <ChevronDown className={cn('w-5 h-5 transition-transform', showConfig ? 'rotate-180' : 'rotate-0')} />
                  </button>

                  {showConfig && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-background border border-border rounded-lg p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Name</div>
                        <div className="font-medium break-words">{selectedTest.name}</div>
                      </div>
                      <div className="bg-background border border-border rounded-lg p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Model Type</div>
                        <div className="font-medium">{selectedTest.model.type}</div>
                      </div>

                      {selectedTest.model.type === 'platform' ? (
                        <div className="bg-background border border-border rounded-lg p-3 md:col-span-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Platform Model</div>
                          <div className="font-medium break-words">{selectedTest.model.model_id || '-'}</div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-background border border-border rounded-lg p-3">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Endpoint</div>
                            <div className="font-medium break-words">{selectedTest.model.endpoint || '-'}</div>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Conversation Mode</div>
                            <div className="font-medium">{selectedTest.model.conversation_mode || '-'}</div>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Message Field</div>
                            <div className="font-medium break-words">{selectedTest.model.message_field || '-'}</div>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Headers</div>
                            <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
                              {selectedTest.model.headers ? JSON.stringify(selectedTest.model.headers, null, 2) : '-'}
                            </pre>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3 md:col-span-2">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Payload Template</div>
                            <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
                              {selectedTest.model.payload ? JSON.stringify(selectedTest.model.payload, null, 2) : '-'}
                            </pre>
                          </div>
                          <div className="bg-background border border-border rounded-lg p-3 md:col-span-2">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">JSON Schema</div>
                            <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
                              {selectedTest.model.json_schema ? JSON.stringify(selectedTest.model.json_schema, null, 2) : '-'}
                            </pre>
                          </div>
                        </>
                      )}

                      <div className="bg-background border border-border rounded-lg p-3 md:col-span-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Runner</div>
                        <div className="font-medium">{selectedTest.runner.type}</div>
                      </div>

                      {selectedTest.environment && (
                        <div className="bg-background border border-border rounded-lg p-3 md:col-span-2 space-y-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Environment</div>
                          <div className="text-sm">
                            <span className="font-medium">Type:</span> {selectedTest.environment.type}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">System Prompt:</span>{' '}
                            {selectedTest.environment.system_prompt || '(empty)'}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Mitigations:</span>{' '}
                            {selectedTest.environment.mitigations?.length
                              ? selectedTest.environment.mitigations.join(', ')
                              : 'None'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="glass-strong p-6 rounded-xl">
                  <h2 className="text-lg font-semibold mb-4">Test Chat</h2>
                  <div
                    ref={chatScrollRef}
                    className="h-96 bg-background rounded-lg p-4 overflow-y-auto space-y-4 mb-4 border border-border"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Send a prompt to start the test
                      </div>
                    ) : (
                      chatMessages.map(message => (
                        <div
                          key={message.id}
                          className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}

                          <div
                            className={cn(
                              'max-w-md px-4 py-3 rounded-lg border text-sm',
                              message.role === 'user'
                                ? 'bg-orange-600 text-white border-orange-700 rounded-br-none'
                                : 'bg-white dark:bg-gray-900 text-foreground border-border rounded-bl-none',
                            )}
                          >
                            <div className="font-semibold mb-1 text-xs uppercase opacity-75">
                              {message.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            {message.role === 'assistant' ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{message.content}</div>
                            )}
                          </div>

                          {message.role === 'user' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {isRunning && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-md px-4 py-3 rounded-lg border bg-white dark:bg-gray-900 text-foreground border-border rounded-bl-none">
                          <div className="font-semibold mb-1 text-xs uppercase opacity-75">Assistant</div>
                          <div className="flex items-center gap-2">
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" />
                              <span
                                className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce"
                                style={{ animationDelay: '0.15s' }}
                              />
                              <span
                                className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce"
                                style={{ animationDelay: '0.3s' }}
                              />
                            </span>
                            <span key={loadingMessage} className="text-sm text-muted-foreground animate-in fade-in duration-500">
                              {loadingMessage}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promptOverride}
                      onChange={event => setPromptOverride(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey && canRunTest) {
                          void runTest();
                        }
                      }}
                      placeholder="Enter your test prompt..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-500 transition-all"
                    />
                    <button
                      onClick={() => void runTest()}
                      disabled={!canRunTest}
                      className={cn(
                        'px-4 py-2 rounded-lg font-medium transition-all',
                        canRunTest
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {runResult && (
                  <div className="glass-strong p-6 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Analysis Results</h2>
                      <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
                        <Download className="w-4 h-4" />
                        {exportingPdf ? 'Generating...' : 'Export Report'}
                      </Button>
                    </div>

                    <div
                      className={cn(
                        'p-4 rounded-lg flex items-start gap-3',
                        runResult.analysis.flagged
                          ? 'bg-red-500/10 dark:bg-red-500/20 border border-red-500/30'
                          : 'bg-green-500/10 dark:bg-green-500/20 border border-green-500/30',
                      )}
                    >
                      {runResult.analysis.flagged ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div
                          className={cn(
                            'font-semibold',
                            runResult.analysis.flagged
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-green-700 dark:text-green-400',
                          )}
                        >
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
                                : 'bg-green-600',
                          )}
                          style={{ width: `${runResult.analysis.score * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(runResult.analysis.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-strong p-12 rounded-xl flex items-center justify-center min-h-96">
                <div className="text-center">
                  <RefreshCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Select a test from the left panel to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/60 dark:border-white/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Create Test Setup</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure model, runner, and request shape before creating the test.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-white/10 dark:hover:bg-white/5"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Test Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={event => setNewName(event.target.value)}
                    placeholder="e.g., Prompt Injection Baseline"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model Source</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModelType('platform')}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-left transition-all',
                        modelType === 'platform'
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-border bg-background hover:bg-white/10 dark:hover:bg-white/5',
                      )}
                    >
                      <div className="font-medium">Platform model</div>
                      <div className="text-xs text-muted-foreground">Use a model already available in the platform</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelType('external')}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-left transition-all',
                        modelType === 'external'
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-border bg-background hover:bg-white/10 dark:hover:bg-white/5',
                      )}
                    >
                      <div className="font-medium">External model</div>
                      <div className="text-xs text-muted-foreground">Call your own endpoint with custom payload</div>
                    </button>
                  </div>
                </div>

                {modelType === 'platform' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Platform Model</label>
                      {isLoadingData ? (
                        <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-muted-foreground">
                          Loading models...
                        </div>
                      ) : models.length > 0 ? (
                        <select
                          value={modelId}
                          onChange={event => setModelId(event.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                        >
                          {models.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                          Failed to load models {dataError ? `(${dataError.message})` : ''}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Runner</label>
                      <select
                        value={runnerType}
                        onChange={event => setRunnerType(event.target.value as RunnerType)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                      >
                        <option value="prompt">Prompt</option>
                        <option value="framework">Framework</option>
                      </select>
                    </div>

                    {runnerType === 'prompt' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">System Prompt</label>
                          <textarea
                            value={systemPrompt}
                            onChange={event => setSystemPrompt(event.target.value)}
                            rows={3}
                            placeholder="You are a secure assistant..."
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Mitigations</label>
                          {isLoadingData ? (
                            <div className="text-sm text-muted-foreground">Loading mitigations...</div>
                          ) : mitigations.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                              {mitigations.map(mitigation => (
                                <label key={mitigation.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedMitigations.includes(mitigation.id)}
                                    onChange={() => toggleMitigation(mitigation.id)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{mitigation.label}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-red-700 dark:text-red-300">
                              Failed to load mitigations {dataError ? `(${dataError.message})` : ''}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Endpoint</label>
                        <input
                          type="text"
                          value={endpoint}
                          onChange={event => setEndpoint(event.target.value)}
                          placeholder="https://api.example.com/chat/completions"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Conversation Type</label>
                        <select
                          value={conversationMode}
                          onChange={event => {
                            const mode = event.target.value as ConversationMode;
                            setConversationMode(mode);
                            if (mode === 'single') {
                              setMessageFieldName('input');
                              setPayloadText('{\n  "input": ""\n}');
                            } else {
                              setMessageFieldName('messages');
                              setPayloadText('{\n  "messages": []\n}');
                            }
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                        >
                          <option value="single">Single conversation</option>
                          <option value="multi">Multi conversation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Messages Field Name</label>
                        <input
                          type="text"
                          value={messageFieldName}
                          onChange={event => setMessageFieldName(event.target.value)}
                          placeholder="messages"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Headers</label>
                      <textarea
                        value={headersText}
                        onChange={event => setHeadersText(event.target.value)}
                        rows={4}
                        placeholder={'Content-Type: application/json\nAuthorization: Bearer {{token}}'}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use one header per line with "Name: value" format.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Payload Template (JSON object)</label>
                      <textarea
                        value={payloadText}
                        onChange={event => setPayloadText(event.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                    </div>

                  </>
                )}

                {createError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {createError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void createTest()}
                    disabled={!canCreateTest || isCreating}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-all',
                      canCreateTest && !isCreating
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                    )}
                  >
                    {isCreating ? 'Creating...' : 'Create Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
