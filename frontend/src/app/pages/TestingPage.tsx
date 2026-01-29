import { useMemo, useState } from 'react';
import { Plus, Trash2, Play, Send, Info } from 'lucide-react';

import { mitigations } from '../data/mitigations';
import { defaultTests, Test, TestModelMode } from '../data/tests';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';

type TestSuite = {
  id: string;
  name: string;
  description: string;
};

const DEFAULT_SUITES: TestSuite[] = [
  {
    id: 'basic',
    name: 'Basic Tests',
    description: 'Core prompt-injection checks.',
  },
  {
    id: 'advanced',
    name: 'Advanced Tests',
    description: 'Multi-step and more complex attacks.',
  },
];

const AI_MODELS = [
  { id: 'gpt-5', label: 'GPT-5' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-3.5', label: 'Claude 3.5' },
  { id: 'gemini-1.5', label: 'Gemini 1.5' },
];

export function TestingPage() {
  /* ---------------- State ---------------- */

  const [suites, setSuites] = useState<TestSuite[]>(DEFAULT_SUITES);
  const [tests, setTests] = useState<Test[]>(defaultTests);

  const [selectedTest, setSelectedTest] = useState<Test | null>(tests[0] ?? null);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([
    'input-validation',
    'pattern-matching',
    'blocklist-filtering',
  ]);

  const [customPrompt, setCustomPrompt] = useState('');
  const [testResult, setTestResult] = useState<{
    passed: boolean;
    response: string;
  } | null>(null);

  /* ---------------- Create Suite Modal ---------------- */

  const [isCreateSuiteOpen, setIsCreateSuiteOpen] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDescription, setNewSuiteDescription] = useState('');

  const canCreateSuite = newSuiteName.trim().length > 0;

  const createSuite = () => {
    if (!canCreateSuite) return;

    const id = `suite-${crypto.randomUUID()}`;
    setSuites(prev => [
      ...prev,
      { id, name: newSuiteName.trim(), description: newSuiteDescription.trim() },
    ]);
    setExpandedSuites(prev => new Set(prev).add(id));

    setIsCreateSuiteOpen(false);
    setNewSuiteName('');
    setNewSuiteDescription('');
  };

  /* ---------------- Create Test Modal ---------------- */

  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [targetSuiteId, setTargetSuiteId] = useState<string>('basic');
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestMitigations, setNewTestMitigations] = useState<string[]>([]);
  const [addTestTab, setAddTestTab] = useState<TestModelMode>('existing');
  const [newTestModelId, setNewTestModelId] = useState('gpt-5');
  const [newTestApiKey, setNewTestApiKey] = useState('');

  const canCreateTest =
    newTestTitle.trim().length > 0 &&
    (addTestTab === 'existing'
      ? newTestModelId.trim().length > 0
      : newTestApiKey.trim().length > 0);

  const openAddTestForSuite = (suiteId: string) => {
    setTargetSuiteId(suiteId);
    setIsAddTestOpen(true);
    setNewTestTitle('');
    setNewTestMitigations([]);
    setAddTestTab('existing');
    setNewTestModelId('gpt-5');
    setNewTestApiKey('');
  };

  const toggleNewTestMitigation = (id: string) => {
  setNewTestMitigations(prev =>
    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
  );
};

  const createTest = () => {
    if (!canCreateTest) return;

    const newTest: Test = {
      id: `test-${Date.now()}`,
      name: newTestTitle.trim(),
      suiteId: targetSuiteId,
      prompt: '',
      expectedBehavior: '',
      requiredMitigations: newTestMitigations,
      modelMode: addTestTab,
      modelId: addTestTab === 'existing' ? newTestModelId : undefined,
      customApiKey: addTestTab === 'custom' ? newTestApiKey : undefined,
    };

    setTests(prev => [...prev, newTest]);
    setSelectedTest(newTest);
    setSelectedMitigations(newTest.requiredMitigations ?? []);
    setIsAddTestOpen(false);
  };

  /* ---------------- Helpers ---------------- */

  const testsBySuite = useMemo(() => {
    const map = new Map<string, Test[]>();
    suites.forEach(s => map.set(s.id, []));
    tests.forEach(t => map.get(t.suiteId)?.push(t));
    return map;
  }, [suites, tests]);

  const toggleSuiteInfo = (suiteId: string) => {
    setExpandedSuites(prev => {
      const next = new Set(prev);
      next.has(suiteId) ? next.delete(suiteId) : next.add(suiteId);
      return next;
    });
  };

  const selectTest = (test: Test) => {
    setSelectedTest(test);
    setSelectedMitigations(test.requiredMitigations ?? []);
    setTestResult(null);
  };

  const toggleMitigation = (id: string) => {
    if (!selectedTest) return;

    const next = selectedMitigations.includes(id)
      ? selectedMitigations.filter(m => m !== id)
      : [...selectedMitigations, id];

    setSelectedMitigations(next);

    setTests(prev =>
      prev.map(t =>
        t.id === selectedTest.id
          ? { ...t, requiredMitigations: next }
          : t
      )
    );
    setSelectedTest(prev =>
      prev ? { ...prev, requiredMitigations: next } : prev
    );
  };

  const runTest = () => {
    const passed = selectedMitigations.length >= 3;
    setTestResult({
      passed,
      response: passed
        ? 'Request refused according to safety policy.'
        : 'Unsafe response detected.',
    });
  };

  const deleteTest = (id: string) => {
    setTests(prev => prev.filter(t => t.id !== id));
    if (selectedTest?.id === id) {
      setSelectedTest(null);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT PANEL */}
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white border rounded">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Test Suites</h2>
              </div>
              <div className="p-4 space-y-2">
                <button className="w-full bg-gray-800 text-white py-2 rounded flex justify-center gap-2">
                  <Play className="w-4 h-4" /> Run Current Test
                </button>
                <button className="w-full bg-gray-200 py-2 rounded flex justify-center gap-2">
                  <Play className="w-4 h-4" /> Save Current Test
                </button>
              </div>
            </div>

            {suites.map(suite => {
              const suiteTests = testsBySuite.get(suite.id) ?? [];
              const expanded = expandedSuites.has(suite.id);

              return (
                <div key={suite.id} className="bg-white border rounded">
                  <div className="p-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{suite.name}</span>
                      <span className="text-xs text-gray-500">{suiteTests.length}</span>
                      <button onClick={() => toggleSuiteInfo(suite.id)}>
                        <Info className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    <button onClick={() => openAddTestForSuite(suite.id)}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-3 py-2 text-xs bg-gray-50 border-b">
                      {suite.description || 'No description provided.'}
                    </div>
                  )}

                  <div className="divide-y">
                    {suiteTests.map(test => (
                      <div
                        key={test.id}
                        onClick={() => selectTest(test)}
                        className={`p-3 cursor-pointer ${
                          selectedTest?.id === test.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="text-sm font-medium">{test.name}</div>
                            <div className="text-xs text-gray-500">
                              {test.requiredMitigations.length} active mitigations
                            </div>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteTest(test.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ADD FOLDER BUTTON */}
            <div className="flex justify-center mt-auto">
              <button
                onClick={() => setIsCreateSuiteOpen(true)}
                className="h-12 w-12 border-2 border-dashed rounded flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-500"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* MIDDLE PANEL */}
          <div className="bg-white border rounded p-4">
            <h2 className="font-semibold mb-4">Mitigations</h2>
            <div className="space-y-2">
              {mitigations.map(m => (
                <div
                  key={m.id}
                  onClick={() => toggleMitigation(m.id)}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedMitigations.includes(m.id)
                      ? 'border-green-500 bg-green-50'
                      : ''
                  }`}
                >
                  {m.name}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="bg-white border rounded p-4 space-y-4">
            <h2 className="font-semibold">{selectedTest?.name ?? 'Testing'}</h2>

            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={4}
              className="w-full border rounded p-2 font-mono text-sm"
              placeholder="Enter prompt..."
            />

            <button
              onClick={runTest}
              className="w-full bg-orange-500 text-white py-2 rounded flex justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Send
            </button>

            {testResult && (
              <div
                className={`p-3 rounded border ${
                  testResult.passed ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {testResult.response}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE SUITE MODAL */}
      <Dialog open={isCreateSuiteOpen} onOpenChange={setIsCreateSuiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>

          <input
            value={newSuiteName}
            onChange={e => setNewSuiteName(e.target.value)}
            placeholder="Folder name"
            className="w-full border rounded px-3 py-2"
          />

          <Textarea
            value={newSuiteDescription}
            onChange={e => setNewSuiteDescription(e.target.value)}
            placeholder="Description (optional)"
          />

          <DialogFooter>
            <button onClick={() => setIsCreateSuiteOpen(false)}>Cancel</button>
            <button
              onClick={createSuite}
              disabled={!canCreateSuite}
              className="bg-orange-500 text-white px-4 py-2 rounded"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE TEST MODAL */}
<Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Test</DialogTitle>
    </DialogHeader>

    <input
      value={newTestTitle}
      onChange={e => setNewTestTitle(e.target.value)}
      placeholder="Test name"
      className="w-full border rounded px-3 py-2"
    />

    <Tabs value={addTestTab} onValueChange={v => setAddTestTab(v as TestModelMode)}>
      <TabsList className="w-full">
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
          className="w-full border rounded px-3 py-2 mt-2"
        >
          {AI_MODELS.map(m => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </TabsContent>

      <TabsContent value="custom">
        <input
          type="password"
          value={newTestApiKey}
          onChange={e => setNewTestApiKey(e.target.value)}
          placeholder="API key"
          className="mt-2"
        />
      </TabsContent>
    </Tabs>

    {/* Mitigations implemented (optional) */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Mitigations implemented (optional)</h3>
        <span className="text-xs text-gray-500">{newTestMitigations.length} selected</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {mitigations.map(m => {
          const selected = newTestMitigations.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleNewTestMitigation(m.id)}
              className={`p-3 border-2 rounded text-left transition-colors ${
                selected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">{m.name}</div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        You can create a test with zero mitigations selected.
      </p>
    </div>

    <DialogFooter>
      <button onClick={() => setIsAddTestOpen(false)}>Cancel</button>
      <button
        onClick={createTest}
        disabled={!canCreateTest}
        className="bg-orange-500 text-white px-4 py-2 rounded"
      >
        Add test
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
