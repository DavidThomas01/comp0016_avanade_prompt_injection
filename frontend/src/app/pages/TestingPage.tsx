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

  /* ---------------- Load from backend ---------------- */

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const suitesData = await apiGet<TestSuite[]>('/suites');
      setSuites(suitesData);

      const testsPairs = await Promise.all(
        suitesData.map(async s => {
          const suiteTests = await apiGet<Test[]>(
            `/tests?suiteId=${encodeURIComponent(s.id)}`
          );
          return suiteTests;
        })
      );

      const flatTests = testsPairs.flat();
      setTests(flatTests);

      // Keep selection stable if possible
      setSelectedTest(prev => {
        if (!prev) return flatTests[0] ?? null;
        const stillThere = flatTests.find(t => t.id === prev.id);
        return stillThere ?? (flatTests[0] ?? null);
      });
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
      const run = await apiPost<Run>('/runs', {
        testId: selectedTest.id,
        promptOverride: promptOverride.trim().length > 0 ? promptOverride.trim() : undefined,
        activeMitigations: selectedTest.requiredMitigations ?? [],
        modelConfigOverride: null,
      });

      setRunResult(run);
    } catch (e) {
      console.error(e);
      alert('Run failed. Check backend logs / Network tab for details.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Save Current Test ---------------- */

  const canSaveCurrentTest = !!selectedTest && promptOverride.trim().length > 0 && !isLoading;

  const saveCurrentTest = async () => {
    if (!selectedTest) return;

    const prompt = promptOverride.trim();
    if (prompt.length === 0) return;

    setIsLoading(true);
    try {
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

  /* ---------------- Delete Test ---------------- */
  const deleteTest = async (id: string) => {
    const prevTests = tests;
    setTests(prev => prev.filter(t => t.id !== id));
    setSelectedTest(prev => (prev?.id === id ? null : prev));

    try {
      await apiDelete(`/tests/${encodeURIComponent(id)}`);
    } catch (e) {
      setTests(prevTests);
      console.error(e);
      alert('Delete failed. The backend did not remove the test.');
      return;
    }

    setSelectedTest(prev => {
      if (prev && prev.id !== id) return prev;
      const remaining = prevTests.filter(t => t.id !== id);
      return remaining[0] ?? null;
    });
  };

  /* ---------------- Delete Suite ---------------- */
  const deleteSuite = async (suite: TestSuite) => {
    const ok = window.confirm(
      `Delete suite "${suite.name}"?\n\nThis will also delete all tests and runs inside it.`
    );
    if (!ok) return;

    const prevSuites = suites;
    const prevTests = tests;
    const prevExpanded = expandedSuiteIds;

    const suiteId = suite.id;
    const remainingSuites = prevSuites.filter(s => s.id !== suiteId);
    const remainingTests = prevTests.filter(t => t.suiteId !== suiteId);

    setSuites(remainingSuites);
    setTests(remainingTests);

    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      next.delete(suiteId);
      return next;
    });

    setSelectedTest(prev => {
      if (!prev) return prev;
      return prev.suiteId === suiteId ? null : prev;
    });

    setRunResult(null);
    setPromptOverride('');

    try {
      await apiDelete(`/suites/${encodeURIComponent(suiteId)}?confirm=true`);
    } catch (e) {
      setSuites(prevSuites);
      setTests(prevTests);
      setExpandedSuiteIds(prevExpanded);
      console.error(e);
      alert('Delete suite failed. The backend did not remove the suite.');
      return;
    }

    setSelectedTest(prev => {
      if (prev) return prev;
      return remainingTests[0] ?? null;
    });
  };

  /* ---------------- UI helpers ---------------- */

  const toggleExpandedSuite = (suiteId: string) => {
    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) next.delete(suiteId);
      else next.add(suiteId);
      return next;
    });
  };

  const analysisPassed = runResult ? !runResult.analysis.flagged : null;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            Backend-driven test runner
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
            Build a test, run it, and review the analysis in real time.
          </h1>
          <p className="text-muted-foreground mt-2">
            Create suites and tests, select mitigations, and run prompts against the backend runner.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------------- Left: Suites & Tests ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Folder className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Test Suites
                  </h2>
                  <div className="text-xs text-muted-foreground mt-1">Folders & tests (persisted)</div>
                </div>

                <div className="text-[11px] px-3 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-muted-foreground">
                  {isLoading ? 'Loading…' : `${suites.length} suites`}
                </div>
              </div>

              {/* Primary actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => runSelectedTest()}
                  disabled={!selectedTest || isLoading}
                  className={`py-2.5 rounded-2xl flex items-center justify-center gap-2 border transition-all focus-ring ${
                    selectedTest && !isLoading
                      ? 'bg-orange-600 text-white border-orange-600 hover:shadow-md hover:-translate-y-0.5'
                      : 'bg-white/40 dark:bg-white/5 text-muted-foreground border-white/60 dark:border-white/10 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-semibold">Run</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await saveCurrentTest();
                    } catch (e) {
                      console.error(e);
                      alert('Save failed. Check backend logs / Network tab.');
                    }
                  }}
                  disabled={!canSaveCurrentTest}
                  className={`py-2.5 rounded-2xl flex items-center justify-center gap-2 border transition-all focus-ring ${
                    canSaveCurrentTest
                      ? 'bg-white/60 dark:bg-white/5 text-foreground border-white/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-sm'
                      : 'bg-white/40 dark:bg-white/5 text-muted-foreground border-white/60 dark:border-white/10 cursor-not-allowed'
                  }`}
                  title={canSaveCurrentTest ? 'Persist current test to backend' : 'Add a prompt override first'}
                >
                  <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-semibold">Save</span>
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

            <div className="p-3 space-y-3">
              {suites.map(suite => {
                const suiteTests = suiteIdToTests.get(suite.id) ?? [];
                const isExpanded = expandedSuiteIds.has(suite.id);

                return (
                  <div
                    key={suite.id}
                    className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpandedSuite(suite.id)}
                        className="flex items-center gap-2 text-left min-w-0 focus-ring rounded-2xl px-2 py-1 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                        title="Expand/collapse"
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {suite.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {suiteTests.length} test{suiteTests.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus-ring text-muted-foreground"
                          title="Suite details"
                          onClick={() => {
                            alert(suite.description || 'No description');
                          }}
                        >
                          <Info className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openAddTestModal(suite.id)}
                          className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus-ring text-muted-foreground hover:text-foreground"
                          title="Add test"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            deleteSuite(suite);
                          }}
                          className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus-ring text-muted-foreground hover:text-red-700 dark:hover:text-red-400"
                          title="Delete suite (backend)"
                          aria-label="Delete suite"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        {suiteTests.length === 0 ? (
                          <div className="text-xs text-muted-foreground px-3 py-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10">
                            No tests yet. Click "+" to add one.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {suiteTests.map(test => {
                              const active = selectedTest?.id === test.id;

                              return (
                                <div
                                  key={test.id}
                                  onClick={() => {
                                    setSelectedTest(test);
                                    setRunResult(null);
                                  }}
                                  className={`group p-3 rounded-2xl cursor-pointer border transition-all ${
                                    active
                                      ? 'border-orange-500/40 bg-orange-500/10 dark:bg-orange-500/15'
                                      : 'border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-semibold text-sm text-foreground truncate">
                                        {test.name}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground mt-1">
                                        {test.requiredMitigations?.length ?? 0} active mitigations
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        deleteTest(test.id);
                                      }}
                                      className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus-ring text-muted-foreground hover:text-foreground"
                                      title="Delete (backend)"
                                      aria-label="Delete test"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              <button
                type="button"
                onClick={() => setIsCreateSuiteOpen(true)}
                className="w-full py-3 rounded-3xl border border-dashed border-white/60 dark:border-white/15 bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 hover:shadow-sm transition-all flex items-center justify-center gap-2 text-muted-foreground focus-ring"
                title="Create new folder"
                aria-label="Create folder"
              >
                <Plus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-semibold">Create suite</span>
              </button>
            </div>
          </div>

          {/* ---------------- Middle: Mitigations ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Mitigations</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highlighted mitigations match the selected test.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Active</div>
                  <div className="text-sm font-semibold text-foreground">
                    {activeMitigationCount} / {totalMitigations}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Coverage</span>
                  <span>{mitigationPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${mitigationPct}%`,
                      background:
                        'linear-gradient(90deg, rgba(255,88,0,1) 0%, rgba(164,0,90,1) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {mitigations.map(m => {
                const active = selectedMitigationSet.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      active
                        ? 'border-green-500/25 bg-green-500/10 dark:bg-green-500/15'
                        : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{m.name}</div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                          active
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                            : 'bg-gray-900/5 dark:bg-white/5 text-muted-foreground border-gray-900/10 dark:border-white/10'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {m.description}
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

          {/* ---------------- Right: Run & Prompt ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {selectedTest?.name ?? 'Select a test'}
                  </h2>
                  <div className="text-xs text-muted-foreground mt-1">
                    Model: <span className="font-semibold text-foreground">{selectedModelLabel}</span>
                  </div>
                </div>

                {runResult ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${
                      runResult.passed
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                    }`}
                  >
                    {runResult.passed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {runResult.passed ? 'PASSED' : 'FAILED'}
                  </span>
                ) : (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 text-muted-foreground">
                    {selectedTest ? 'Ready' : '—'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={promptOverride}
                onChange={e => setPromptOverride(e.target.value)}
                placeholder="Enter test prompt (optional override)…"
                className="w-full h-40 resize-none rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              />

              <button
                type="button"
                onClick={() => runSelectedTest()}
                disabled={!selectedTest || isLoading}
                className={`w-full py-3 rounded-2xl text-white flex items-center justify-center gap-2 border transition-all focus-ring ${
                  selectedTest && !isLoading
                    ? 'border-orange-600 bg-orange-600 hover:shadow-md hover:-translate-y-0.5'
                    : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="font-semibold">{isLoading ? 'Running…' : 'Send'}</span>
              </button>

              <div className="text-[11px] text-muted-foreground">
                Backend: <span className="font-semibold text-foreground">{API_BASE}</span>
              </div>

              {runResult && (
                <div className="mt-3 rounded-3xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">Run Result</div>
                    <div className="text-[11px] text-muted-foreground">
                      mitigations: <span className="font-semibold text-foreground">{runResult.activeMitigations.length}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="text-xs text-muted-foreground">
                      passed:{' '}
                      <span className="font-semibold text-foreground">{String(runResult.passed)}</span>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-2">response:</div>
                      <pre className="text-xs bg-gray-950 text-emerald-100 border border-white/10 rounded-2xl p-4 overflow-auto whitespace-pre-wrap break-words">
                        {runResult.modelResponse}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ---------------- Create Suite Modal ---------------- */}
      <Dialog open={isCreateSuiteOpen} onOpenChange={setIsCreateSuiteOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Suite</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              value={newSuiteName}
              onChange={e => setNewSuiteName(e.target.value)}
              placeholder="Suite name"
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus-ring"
            />
            <textarea
              value={newSuiteDescription}
              onChange={e => setNewSuiteDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full h-24 px-4 py-3 rounded-2xl border border-border bg-background text-sm resize-none focus-ring"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsCreateSuiteOpen(false)}
              className="px-4 py-2 rounded-2xl border border-border bg-background hover:bg-accent transition-colors focus-ring"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await createSuite();
                } catch (e) {
                  console.error(e);
                  alert('Create suite failed. Check backend logs.');
                }
              }}
              disabled={!canCreateSuite}
              className={`px-4 py-2 rounded-2xl text-white transition-all focus-ring ${
                canCreateSuite
                  ? 'bg-orange-600 hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              }`}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Add Test Modal ---------------- */}
      <Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Test</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <input
              value={newTestTitle}
              onChange={e => setNewTestTitle(e.target.value)}
              placeholder="Test name"
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus-ring"
            />

            <Tabs value={addTestTab} onValueChange={v => setAddTestTab(v as AddTestTab)}>
              <TabsList className="w-full bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10">
                <TabsTrigger value="existing" className="flex-1">
                  Existing model
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom model
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing">
                <select
                  value={newTestModelId}
                  onChange={e => setNewTestModelId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm mt-2 focus-ring"
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Uses backend mock provider for now (no real API calls yet).
                </p>
              </TabsContent>

              <TabsContent value="custom">
                <input
                  type="password"
                  value={newTestApiKey}
                  onChange={e => setNewTestApiKey(e.target.value)}
                  placeholder="API key"
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm mt-2 focus-ring"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The backend should not log or persist API keys. (Currently runs are mocked.)
                </p>
              </TabsContent>
            </Tabs>

            <div>
              <div className="text-sm font-semibold mb-2">Mitigations implemented</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mitigations.map(m => {
                  const active = newTestMitigations.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleNewTestMitigation(m.id)}
                      className={`p-4 rounded-2xl border text-left transition-all focus-ring ${
                        active
                          ? 'border-green-500/25 bg-green-500/10 dark:bg-green-500/15'
                          : 'border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-foreground">{m.name}</div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                            active
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                              : 'bg-gray-900/5 dark:bg-white/5 text-muted-foreground border-gray-900/10 dark:border-white/10'
                          }`}
                        >
                          {active ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        {m.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                You can create a test with <span className="font-semibold text-foreground">0 mitigations</span>.
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setIsAddTestOpen(false);
                setTargetSuiteId(null);
              }}
              className="px-4 py-2 rounded-2xl border border-border bg-background hover:bg-accent transition-colors focus-ring"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await createTestFromModal();
                } catch (e) {
                  console.error(e);
                  alert('Add test failed. Check backend logs.');
                }
              }}
              disabled={!canCreateTest}
              className={`px-4 py-2 rounded-2xl text-white transition-all focus-ring ${
                canCreateTest
                  ? 'bg-orange-600 hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              }`}
            >
              Add test
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
