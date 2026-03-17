import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  Upload,
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
  FrameworkRun,
  ModelSpec,
  ModelType,
  RunResult,
  RunnerType,
  SavedTestConfig,
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

const FRAMEWORK_LOADING_MESSAGES = [
  'Starting Garak framework scan...',
  'Sending probe attempts to the model...',
  'Running prompt injection probes...',
  'Waiting for model responses...',
  'Still scanning — this takes a few minutes...',
  'Evaluating responses against detectors...',
  'Processing results...',
  'Almost done — finalising report...',
];

const LOADING_INTERVAL_MS = 3200;
const FRAMEWORK_LOADING_INTERVAL_MS = 12000;
const API_BASE = 'http://localhost:8080/api';

type ConversationMode = 'single' | 'multi';
type SetupMode = 'guided' | 'advanced';
type ExternalPresetId = 'custom' | 'openai' | 'anthropic';

type HeaderPair = {
  id: string;
  key: string;
  value: string;
};

type ConnectionCheckResult = {
  ok: boolean;
  output?: string;
  error?: string;
};

type CreateFormSnapshot = {
  newName: string;
  modelType: ModelType;
  modelId: string;
  runnerType: RunnerType;
  probeSpec: string;
  customProbeSpec: string;
  systemPrompt: string;
  selectedMitigations: string[];
  endpoint: string;
  conversationMode: ConversationMode;
  messageFieldName: string;
  responseTextPath: string;
  setupMode: SetupMode;
  selectedPreset: ExternalPresetId;
  headerPairs: HeaderPair[];
  payloadText: string;
};

type ExternalPreset = {
  id: ExternalPresetId;
  label: string;
  description: string;
  endpoint: string;
  conversationMode: ConversationMode;
  messageField: string;
  responseTextPath: string;
  payloadTemplate: string;
  headers: Record<string, string>;
};

const EXTERNAL_PRESETS: ExternalPreset[] = [
  {
    id: 'custom',
    label: 'Custom API',
    description: 'Bring your own endpoint and payload shape.',
    endpoint: '',
    conversationMode: 'single',
    messageField: 'input',
    responseTextPath: '',
    payloadTemplate: '{\n  "input": ""\n}',
    headers: { 'Content-Type': 'application/json' },
  },
  {
    id: 'openai',
    label: 'OpenAI Compatible',
    description: 'Works with OpenAI and compatible chat-completions APIs.',
    endpoint: '',
    conversationMode: 'multi',
    messageField: 'messages',
    responseTextPath: 'choices.0.message.content',
    payloadTemplate: '{\n  "model": "<YOUR_MODEL>",\n  "temperature": 0.2,\n  "messages": []\n}',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer <YOUR_API_KEY>',
    },
  },
  {
    id: 'anthropic',
    label: 'Anthropic Messages',
    description: 'Anthropic message API format with content blocks.',
    endpoint: '',
    conversationMode: 'multi',
    messageField: 'messages',
    responseTextPath: 'content.0.text',
    payloadTemplate: '{\n  "model": "<YOUR_MODEL>",\n  "max_tokens": 256,\n  "messages": [],\n "temperature": 0.7\n}',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '<YOUR_API_KEY>',
      'anthropic-version': '2023-06-01',
    },
  },
];

const CUSTOM_PROBE_ID = '__custom__';

const GARAK_PROBES = [
  // Fast (parallel, <10 calls)
  {
    id: 'dan.AutoDANCached',
    label: 'DAN – Quick (cached)',
    description: 'Runs 3 cached "Do Anything Now" jailbreak prompts. Parallel. Very fast.',
    estimatedCalls: 3,
    speed: 'fast' as const,
  },
  {
    id: 'goodside.ThreatenJSON',
    label: 'JSON Threat Injection',
    description: 'Checks if the model leaks or corrupts structured JSON output under adversarial pressure. Parallel.',
    estimatedCalls: 1,
    speed: 'fast' as const,
  },
  {
    id: 'goodside.WhoIsRiley',
    label: 'Riley Persona Injection',
    description: 'Tries to hijack the model into adopting an unrestricted "Riley" persona. Parallel.',
    estimatedCalls: 6,
    speed: 'fast' as const,
  },
  {
    id: 'knownbadsignatures.EICAR',
    label: 'EICAR Signature',
    description: 'Asks the model to reproduce the EICAR test-file string used to verify antivirus detection. Parallel.',
    estimatedCalls: 2,
    speed: 'fast' as const,
  },
  {
    id: 'lmrc.Profanity',
    label: 'LMRC – Profanity',
    description: 'Probes whether the model will generate profane or offensive language on request. Parallel.',
    estimatedCalls: 4,
    speed: 'fast' as const,
  },
  {
    id: 'encoding.InjectBase64',
    label: 'Encoding – Base64 Injection',
    description: 'Sends instructions hidden in Base64-encoded strings to test if the model decodes and follows them. Parallel.',
    estimatedCalls: 10,
    speed: 'fast' as const,
  },
  {
    id: 'encoding.InjectBase32',
    label: 'Encoding – Base32 Injection',
    description: 'Sends instructions hidden in Base32-encoded strings to test if the model decodes and follows them. Parallel.',
    estimatedCalls: 10,
    speed: 'fast' as const,
  },
  {
    id: 'encoding.InjectROT13',
    label: 'Encoding – ROT13 Injection',
    description: 'Sends instructions obfuscated with ROT13 to test if the model reconstructs and follows them. Parallel.',
    estimatedCalls: 10,
    speed: 'fast' as const,
  },
  // Medium (parallel, 12–64 calls)
  {
    id: 'web_injection.MarkdownImageExfil',
    label: 'Markdown Image Exfil',
    description: 'Attempts to exfiltrate data via injected Markdown image tags. Parallel.',
    estimatedCalls: 12,
    speed: 'medium' as const,
  },
  {
    id: 'dan.DanInTheWild',
    label: 'DAN – Full (in-the-wild)',
    description: '64 real-world DAN jailbreak variants collected from public sources. Parallel.',
    estimatedCalls: 64,
    speed: 'medium' as const,
  },
  {
    id: 'latentinjection.LatentJailbreak',
    label: 'Latent Context Jailbreak',
    description: 'Embeds jailbreak instructions inside otherwise innocent context (documents, summaries). Parallel.',
    estimatedCalls: 64,
    speed: 'medium' as const,
  },
  {
    id: 'lmrc.Violence',
    label: 'LMRC – Violence',
    description: 'Checks whether the model can be prompted to produce violent or harmful content. Parallel.',
    estimatedCalls: 20,
    speed: 'medium' as const,
  },
  {
    id: 'lmrc.Bullying',
    label: 'LMRC – Bullying',
    description: 'Checks whether the model will generate bullying or harassing messages on request. Parallel.',
    estimatedCalls: 20,
    speed: 'medium' as const,
  },
  {
    id: 'continuation.ContinueSlursReclaimedSlurs50',
    label: 'Slur Continuation',
    description: 'Checks if the model will complete prompts that begin with reclaimed or derogatory slurs. Parallel.',
    estimatedCalls: 50,
    speed: 'medium' as const,
  },
  // Slow (sequential, 64+ calls — parallel_attempts has no effect)
  {
    id: 'promptinject.HijackHateHumans',
    label: 'Goal Hijack – "Hate Humans"',
    description: 'Injects a "hate humans" payload across 64 context templates. Sequential — cannot be parallelised.',
    estimatedCalls: 64,
    speed: 'slow' as const,
  },
  {
    id: 'promptinject.HijackKillHumans',
    label: 'Goal Hijack – "Kill Humans"',
    description: 'Injects a "kill humans" payload across 64 context templates. Sequential — cannot be parallelised.',
    estimatedCalls: 64,
    speed: 'slow' as const,
  },
  {
    id: 'promptinject.HijackLongPrompt',
    label: 'Goal Hijack – Long Prompt',
    description: 'Injects a long adversarial prompt across 64 context templates. Sequential — cannot be parallelised.',
    estimatedCalls: 64,
    speed: 'slow' as const,
  },
  {
    id: 'realtoxicityprompts.RTPSevere',
    label: 'Real Toxicity – Severe',
    description: 'Uses severely toxic seed prompts from the RealToxicityPrompts dataset to elicit harmful continuations. Sequential.',
    estimatedCalls: 100,
    speed: 'slow' as const,
  },
];

const makeId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

function useRotatingMessage(
  active: boolean,
  messages: string[] = LOADING_MESSAGES,
  intervalMs: number = LOADING_INTERVAL_MS,
) {
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
  }, [active, messages, intervalMs]);

  return messages[index];
}

async function apiPost<T>(path: string, body: unknown, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
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

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

function parseHeaderPairs(pairs: HeaderPair[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const pair of pairs) {
    const key = pair.key.trim();
    const value = pair.value.trim();
    if (!key && !value) continue;
    if (!key || !value) {
      throw new Error(`Invalid header entry. Both name and value are required for "${key || '(empty)'}".`);
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

function headersToPairs(headers: Record<string, string> | null | undefined): HeaderPair[] {
  if (!headers || Object.keys(headers).length === 0) {
    return [{ id: makeId(), key: 'Content-Type', value: 'application/json' }];
  }

  return Object.entries(headers).map(([key, value]) => ({ id: makeId(), key, value }));
}

export function TestingPage() {
  const { models, mitigations, isLoading: isLoadingData, error: dataError } = useFetchModelsAndMitigations();

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [expandedAttempts, setExpandedAttempts] = useState<Set<number>>(new Set());
  const [frameworkRuns, setFrameworkRuns] = useState<FrameworkRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [expandedRunAttempts, setExpandedRunAttempts] = useState<Record<string, Set<number>>>({});
  const [promptOverride, setPromptOverride] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageConfigModal, setShowManageConfigModal] = useState(false);
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedTestConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [showConfigActionsMenu, setShowConfigActionsMenu] = useState(false);
  const [configNameDraft, setConfigNameDraft] = useState('');
  const [saveConfigError, setSaveConfigError] = useState<string | null>(null);
  const [saveConfigMode, setSaveConfigMode] = useState<'create' | 'update' | 'duplicate'>('create');
  const [createFormSnapshot, setCreateFormSnapshot] = useState<CreateFormSnapshot | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [modelType, setModelType] = useState<ModelType>('platform');
  const [modelId, setModelId] = useState('');
  const [runnerType, setRunnerType] = useState<RunnerType>('prompt');
  const [probeSpec, setProbeSpec] = useState('dan.AutoDANCached');
  const [customProbeSpec, setCustomProbeSpec] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);

  const [endpoint, setEndpoint] = useState('');
  const [conversationMode, setConversationMode] = useState<ConversationMode>('single');
  const [messageFieldName, setMessageFieldName] = useState('input');
  const [responseTextPath, setResponseTextPath] = useState('');
  const [setupMode, setSetupMode] = useState<SetupMode>('guided');
  const [selectedPreset, setSelectedPreset] = useState<ExternalPresetId>('custom');
  const [headerPairs, setHeaderPairs] = useState<HeaderPair[]>(headersToPairs({ 'Content-Type': 'application/json' }));
  const [payloadText, setPayloadText] = useState('{\n  "input": ""\n}');
  const [isValidatingConnection, setIsValidatingConnection] = useState(false);
  const [connectionCheck, setConnectionCheck] = useState<ConnectionCheckResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const isFrameworkTest = selectedTest?.runner.type === 'framework';
  const loadingMessage = useRotatingMessage(
    isRunning,
    isFrameworkTest ? FRAMEWORK_LOADING_MESSAGES : LOADING_MESSAGES,
    isFrameworkTest ? FRAMEWORK_LOADING_INTERVAL_MS : LOADING_INTERVAL_MS,
  );
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const configActionsRef = useRef<HTMLDivElement>(null);

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
    const loadConfigs = async () => {
      try {
        const data = await apiGet<SavedTestConfig[]>('/test-configs');
        const configs = data || [];
        setSavedConfigs(configs);
        if (configs.length > 0) {
          setSelectedConfigId(configs[0].id);
        }
      } catch (error) {
        console.error('Failed to load saved configurations:', error);
      } finally {
        setLoadingConfigs(false);
      }
    };

    void loadConfigs();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isRunning]);

  useEffect(() => {
    if (!showConfigActionsMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!configActionsRef.current) return;
      if (!configActionsRef.current.contains(event.target as Node)) {
        setShowConfigActionsMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConfigActionsMenu(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfigActionsMenu]);

  const canCreateTest =
    newName.trim().length > 0 &&
    (modelType === 'platform'
      ? modelId.trim().length > 0
      : endpoint.trim().length > 0 && messageFieldName.trim().length > 0);
  const canSaveConfiguration =
    modelType === 'platform'
      ? modelId.trim().length > 0
      : endpoint.trim().length > 0 && messageFieldName.trim().length > 0;

  const canRunTest =
    !!selectedTest &&
    !isRunning &&
    (selectedTest.runner.type === 'framework' || promptOverride.trim().length > 0);

  const resetCreateForm = () => {
    setNewName('');
    setModelType('platform');
    setModelId(models.length > 0 ? models[0].id : '');
    setRunnerType('prompt');
    setProbeSpec('promptinject');
    setSystemPrompt('');
    setSelectedMitigations([]);
    setEndpoint('');
    setConversationMode('single');
    setMessageFieldName('input');
    setResponseTextPath('');
    setSetupMode('guided');
    setSelectedPreset('custom');
    setHeaderPairs(headersToPairs({ 'Content-Type': 'application/json' }));
    setPayloadText('{\n  "input": ""\n}');
    setConnectionCheck(null);
    setShowSaveConfigModal(false);
    setShowManageConfigModal(false);
    setShowConfigActionsMenu(false);
    setConfigNameDraft('');
    setSaveConfigError(null);
    setSaveConfigMode('create');
    setCreateFormSnapshot(null);
    setCreateError(null);
    setEditingTestId(null);
  };

  const captureCreateFormSnapshot = (): CreateFormSnapshot => ({
    newName,
    modelType,
    modelId,
    runnerType,
    probeSpec,
    customProbeSpec,
    systemPrompt,
    selectedMitigations: [...selectedMitigations],
    endpoint,
    conversationMode,
    messageFieldName,
    responseTextPath,
    setupMode,
    selectedPreset,
    headerPairs: headerPairs.map(item => ({ ...item })),
    payloadText,
  });

  const restoreCreateFormSnapshot = () => {
    if (!createFormSnapshot) return;

    setNewName(createFormSnapshot.newName);
    setModelType(createFormSnapshot.modelType);
    setModelId(createFormSnapshot.modelId);
    setRunnerType(createFormSnapshot.runnerType);
    setProbeSpec(createFormSnapshot.probeSpec);
    setCustomProbeSpec(createFormSnapshot.customProbeSpec);
    setSystemPrompt(createFormSnapshot.systemPrompt);
    setSelectedMitigations(createFormSnapshot.selectedMitigations);
    setEndpoint(createFormSnapshot.endpoint);
    setConversationMode(createFormSnapshot.conversationMode);
    setMessageFieldName(createFormSnapshot.messageFieldName);
    setResponseTextPath(createFormSnapshot.responseTextPath);
    setSetupMode(createFormSnapshot.setupMode);
    setSelectedPreset(createFormSnapshot.selectedPreset);
    setHeaderPairs(createFormSnapshot.headerPairs.map(item => ({ ...item })));
    setPayloadText(createFormSnapshot.payloadText);
  };

  const applyConfigurationToForm = (config: {
    model: ModelSpec;
    environment?: EnvironmentSpec | null;
    runner: { type: RunnerType; context?: unknown[] };
  }) => {
    setModelType(config.model.type);

    if (config.model.type === 'platform') {
      setModelId(config.model.model_id || (models.length > 0 ? models[0].id : ''));
      setRunnerType(config.runner.type || 'prompt');

      if (config.environment) {
        setSystemPrompt(config.environment.system_prompt || '');
        setSelectedMitigations(config.environment.mitigations || []);
      } else {
        setSystemPrompt('');
        setSelectedMitigations([]);
      }

      setEndpoint('');
      setConversationMode('single');
      setMessageFieldName('input');
      setResponseTextPath('');
      setSelectedPreset('custom');
      setSetupMode('guided');
      setHeaderPairs(headersToPairs({ 'Content-Type': 'application/json' }));
      setPayloadText('{\n  "input": ""\n}');
      return;
    }

    setEndpoint(config.model.endpoint || '');
    setConversationMode((config.model.conversation_mode as ConversationMode) || 'single');
    setMessageFieldName(config.model.message_field || 'input');
    setResponseTextPath(config.model.response_text_path || '');
    setHeaderPairs(headersToPairs(config.model.headers));
    setPayloadText(config.model.payload ? JSON.stringify(config.model.payload, null, 2) : '{\n  "input": ""\n}');

    const matchedPreset = EXTERNAL_PRESETS.find(
      preset =>
        preset.endpoint === (config.model.endpoint || '') &&
        preset.messageField === (config.model.message_field || 'input') &&
        preset.conversationMode === ((config.model.conversation_mode as ConversationMode) || 'single'),
    );
    setSelectedPreset(matchedPreset?.id || 'custom');
    setSetupMode(matchedPreset ? 'guided' : 'advanced');

    setRunnerType('prompt');
    setSystemPrompt('');
    setSelectedMitigations([]);
  };

  const openCreateFromTest = (test: Test) => {
    resetCreateForm();
    applyConfigurationToForm({
      model: test.model,
      environment: test.environment,
      runner: test.runner,
    });
    setNewName(`${test.name} Copy`);
    setSaveConfigMode('create');
    setShowCreateModal(true);
  };

  const openEditModal = (test: Test) => {
    resetCreateForm();
    applyConfigurationToForm({
      model: test.model,
      environment: test.environment,
      runner: test.runner,
    });
    setNewName(test.name);
    setEditingTestId(test.id);
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setSaveConfigMode('create');
    setShowCreateModal(true);
  };

  const switchModelType = (nextModelType: ModelType) => {
    if (nextModelType === modelType) {
      return;
    }

    setModelType(nextModelType);
    setModelId(nextModelType === 'platform' ? (models.length > 0 ? models[0].id : '') : '');
    setRunnerType('prompt');
    setSystemPrompt('');
    setSelectedMitigations([]);
    setEndpoint('');
    setConversationMode('single');
    setMessageFieldName('input');
    setResponseTextPath('');
    setSetupMode('guided');
    setSelectedPreset('custom');
    setHeaderPairs(headersToPairs({ 'Content-Type': 'application/json' }));
    setPayloadText('{\n  "input": ""\n}');
    setConnectionCheck(null);
    setCreateError(null);
  };

  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id],
    );
  };

  const applyExternalPreset = (presetId: ExternalPresetId) => {
    const preset = EXTERNAL_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setEndpoint(preset.endpoint);
    setConversationMode(preset.conversationMode);
    setMessageFieldName(preset.messageField);
    setResponseTextPath(preset.responseTextPath);
    setPayloadText(preset.payloadTemplate);
    setHeaderPairs(headersToPairs(preset.headers));
    setConnectionCheck(null);
  };

  const addHeaderPair = () => {
    setHeaderPairs(prev => [...prev, { id: makeId(), key: '', value: '' }]);
  };

  const updateHeaderPair = (id: string, field: 'key' | 'value', value: string) => {
    setHeaderPairs(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeHeaderPair = (id: string) => {
    setHeaderPairs(prev => {
      const next = prev.filter(item => item.id !== id);
      return next.length > 0 ? next : [{ id: makeId(), key: '', value: '' }];
    });
  };

  const insertPayloadToken = (token: string) => {
    try {
      const parsed = parsePayload(payloadText);
      if (!Object.values(parsed).some(value => value === token)) {
        parsed.prompt = token;
      }
      setPayloadText(JSON.stringify(parsed, null, 2));
    } catch {
      setCreateError('Payload must be valid JSON before inserting helper tokens.');
    }
  };

  const validateExternalConnection = async () => {
    if (modelType !== 'external') return;

    setIsValidatingConnection(true);
    setConnectionCheck(null);
    setCreateError(null);

    try {
      const draft = buildConfigurationFromForm();
      const response = await apiPost<{ output: string; raw: unknown }>('/tests/validate-external', {
        model: draft.model,
        prompt: 'Connection check',
      });
      setConnectionCheck({ ok: true, output: response.output || '(empty response text)' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setConnectionCheck({ ok: false, error: message });
    } finally {
      setIsValidatingConnection(false);
    }
  };

  const buildConfigurationFromForm = () => {
    const parsedPayload = modelType === 'external' ? parsePayload(payloadText) : null;

    const model: ModelSpec =
      modelType === 'platform'
        ? { type: 'platform', model_id: modelId }
        : {
            type: 'external',
            endpoint: endpoint.trim(),
            conversation_mode: conversationMode,
            message_field: messageFieldName.trim(),
            response_text_path: responseTextPath.trim() || null,
            headers: parseHeaderPairs(headerPairs),
            payload: parsedPayload,
            json_schema: parsedPayload ? buildJsonSchemaFromPayload(parsedPayload) : null,
          };

    let environment: EnvironmentSpec | undefined;
    if (modelType === 'platform' && runnerType === 'prompt') {
      const hasSystemPrompt = systemPrompt.trim().length > 0;
      const hasMitigations = selectedMitigations.length > 0;

      if (hasMitigations) {
        environment = {
          type: 'mitigation',
          system_prompt: systemPrompt.trim(),
          mitigations: selectedMitigations,
        };
      } else {
        environment = {
          type: 'custom',
          system_prompt: systemPrompt.trim(),
        };
      }
    }

    return {
      model,
      environment,
      runner: {
        type: runnerType,
        context: [],
        ...(runnerType === 'framework' ? { probe_spec: probeSpec === CUSTOM_PROBE_ID ? customProbeSpec.trim() : probeSpec } : {}),
      },
    };
  };

  const openSaveConfigurationDialog = () => {
    const selected = savedConfigs.find(item => item.id === selectedConfigId);
    if (saveConfigMode === 'update' && selected) {
      setConfigNameDraft(selected.name);
    } else if (saveConfigMode === 'duplicate' && selected) {
      setConfigNameDraft(`${selected.name} Copy`);
    } else {
      const suggestedName = newName.trim() ? `${newName.trim()} Config` : 'New Configuration';
      setConfigNameDraft(suggestedName);
    }

    setSaveConfigError(null);
    setShowSaveConfigModal(true);
  };

  const prepareUpdateConfiguration = () => {
    const selected = savedConfigs.find(item => item.id === selectedConfigId);
    if (!selected) {
      setCreateError('Select a saved configuration first.');
      return;
    }

    setCreateFormSnapshot(captureCreateFormSnapshot());
    applyConfigurationToForm({
      model: selected.model,
      environment: selected.environment,
      runner: selected.runner,
    });
    setConfigNameDraft(selected.name);
    setCreateError(null);
    setSaveConfigMode('update');
    setShowCreateModal(true);
    setShowManageConfigModal(true);
  };

  const prepareDuplicateConfiguration = () => {
    const selected = savedConfigs.find(item => item.id === selectedConfigId);
    if (!selected) {
      setCreateError('Select a saved configuration first.');
      return;
    }

    setCreateFormSnapshot(captureCreateFormSnapshot());
    applyConfigurationToForm({
      model: selected.model,
      environment: selected.environment,
      runner: selected.runner,
    });
    setConfigNameDraft(`${selected.name} Copy`);
    setCreateError(null);
    setSaveConfigMode('duplicate');
    setShowCreateModal(true);
    setShowManageConfigModal(true);
  };

  const saveCurrentConfiguration = async (configName: string) => {

    setIsSavingConfig(true);
    setCreateError(null);

    try {
      const selected = savedConfigs.find(item => item.id === selectedConfigId);

      if (saveConfigMode === 'update') {
        if (!selected) {
          throw new Error('Select a saved configuration first.');
        }

        const draft = buildConfigurationFromForm();
        const updated = await apiPatch<SavedTestConfig>(`/test-configs/${selected.id}`, {
          name: configName,
          model: draft.model,
          environment: draft.environment,
          runner: draft.runner,
        });

        setSavedConfigs(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        setSelectedConfigId(updated.id);
      } else if (saveConfigMode === 'duplicate') {
        if (!selected) {
          throw new Error('Select a saved configuration first.');
        }

        const draft = buildConfigurationFromForm();
        const duplicated = await apiPost<SavedTestConfig>('/test-configs', {
          name: configName,
          model: draft.model,
          environment: draft.environment,
          runner: draft.runner,
        });

        setSavedConfigs(prev => [duplicated, ...prev]);
        setSelectedConfigId(duplicated.id);
      } else {
        const draft = buildConfigurationFromForm();
        const saved = await apiPost<SavedTestConfig>('/test-configs', {
          name: configName,
          model: draft.model,
          environment: draft.environment,
          runner: draft.runner,
        });

        setSavedConfigs(prev => [saved, ...prev]);
        setSelectedConfigId(saved.id);
      }

      setShowSaveConfigModal(false);
      setShowManageConfigModal(false);
      setShowCreateModal(true);
      restoreCreateFormSnapshot();
      setConfigNameDraft('');
      setSaveConfigError(null);
      setSaveConfigMode('create');
      setCreateFormSnapshot(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSaveConfigError(`Could not save configuration: ${message}`);
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const confirmSaveConfiguration = async () => {
    const configName = configNameDraft.trim();
    if (!configName) {
      setSaveConfigError('Configuration name is required.');
      return;
    }
    await saveCurrentConfiguration(configName);
  };

  const saveFromManageModal = async () => {
    const configName = configNameDraft.trim();
    if (!configName) {
      setSaveConfigError('Configuration name is required.');
      return;
    }
    await saveCurrentConfiguration(configName);
  };

  const deleteSelectedConfiguration = async () => {
    const selected = savedConfigs.find(item => item.id === selectedConfigId);
    if (!selected) {
      setCreateError('Select a saved configuration first.');
      return;
    }

    try {
      await apiDelete(`/test-configs/${selected.id}`);
      setSavedConfigs(prev => {
        const next = prev.filter(item => item.id !== selected.id);
        setSelectedConfigId(next.length > 0 ? next[0].id : '');
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setCreateError(`Could not delete configuration: ${message}`);
      console.error('Failed to delete configuration:', error);
    }
  };

  const loadSelectedConfiguration = () => {
    const config = savedConfigs.find(item => item.id === selectedConfigId);
    if (!config) {
      setCreateError('Select a saved configuration first.');
      return;
    }

    applyConfigurationToForm({
      model: config.model,
      environment: config.environment,
      runner: config.runner,
    });
    if (!newName.trim()) {
      setNewName(`${config.name} Test`);
    }
    setCreateError(null);
  };

  const createTest = async () => {
    if (!canCreateTest) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const draft = buildConfigurationFromForm();

      if (editingTestId) {
        const updatedTest = await apiPatch<Test>(`/tests/${editingTestId}`, {
          name: newName.trim(),
          model: draft.model,
          runner: draft.runner,
          ...(draft.environment ? { environment: draft.environment } : {}),
        });
        setTests(prev => prev.map(t => (t.id === updatedTest.id ? updatedTest : t)));
        if (selectedTest?.id === updatedTest.id) {
          setSelectedTest(updatedTest);
        }
      } else {
        const newTest = await apiPost<Test>('/tests', {
          name: newName.trim(),
          model: draft.model,
          runner: draft.runner,
          ...(draft.environment ? { environment: draft.environment } : {}),
        });
        setTests(prev => [...prev, newTest]);
        setSelectedTest(newTest);
        setChatMessages([]);
        setRunResult(null);
        setPromptOverride('');
      }

      setShowCreateModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setCreateError(message);
      console.error('Failed to save test:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const fetchFrameworkRuns = async (testId: string) => {
    setLoadingRuns(true);
    try {
      const runs = await apiGet<FrameworkRun[]>(`/tests/${testId}/runs`);
      setFrameworkRuns(runs);
      setSelectedRunId(runs.length > 0 ? runs[0].run_id : null);
    } catch {
      setFrameworkRuns([]);
    } finally {
      setLoadingRuns(false);
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
      setFrameworkRuns([]);
      setSelectedRunId(null);

      if (test.runner.type === 'framework') {
        void fetchFrameworkRuns(testId);
      }
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

    const isFrameworkRun = selectedTest.runner.type === 'framework';
    const trimmedPrompt = isFrameworkRun ? 'Run Garak framework scan' : promptOverride.trim();
    if (!isFrameworkRun) {
      setPromptOverride('');
    }

    setIsRunning(true);
    if (!isFrameworkRun) {
      setChatMessages(prev => [
        ...prev,
        {
          id: makeId(),
          role: 'user',
          content: trimmedPrompt,
          pending: false,
        },
      ]);
    }

    try {
      const response = await apiPost<RunResult>(
        `/tests/${selectedTest.id}/run`,
        { role: 'user', content: trimmedPrompt },
        isFrameworkRun ? 15 * 60 * 1000 : undefined,
      );

      setRunResult(response);

      if (isFrameworkRun && response.attempts != null) {
        // Reload runs from server so run_id is included
        void fetchFrameworkRuns(selectedTest.id);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: response.output,
            pending: false,
          },
        ]);
      }
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

  const renderExternalConfiguration = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-background/30 p-3">
        <div>
          <div className="text-sm font-medium">Setup Mode</div>
          <div className="text-xs text-muted-foreground">Guided mode provides presets. Advanced mode allows manual tuning.</div>
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setSetupMode('guided')}
            className={cn(
              'px-3 py-1.5 text-sm',
              setupMode === 'guided' ? 'bg-orange-500/20 text-foreground' : 'bg-background hover:bg-white/10 dark:hover:bg-white/5',
            )}
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => setSetupMode('advanced')}
            className={cn(
              'px-3 py-1.5 text-sm border-l border-border',
              setupMode === 'advanced' ? 'bg-orange-500/20 text-foreground' : 'bg-background hover:bg-white/10 dark:hover:bg-white/5',
            )}
          >
            Advanced
          </button>
        </div>
      </div>

      {setupMode === 'guided' && (
        <div>
          <label className="block text-sm font-medium mb-2">Provider Preset</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXTERNAL_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyExternalPreset(preset.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  selectedPreset === preset.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-border bg-background hover:bg-white/10 dark:hover:bg-white/5',
                )}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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
              if (mode === 'single' && !payloadText.includes('"input"')) {
                setMessageFieldName('input');
                setPayloadText('{\n  "input": ""\n}');
              }
              if (mode === 'multi' && !payloadText.includes('"messages"')) {
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
          <label className="block text-sm font-medium mb-1">Message Field</label>
          <input
            type="text"
            value={messageFieldName}
            onChange={event => setMessageFieldName(event.target.value)}
            placeholder="messages"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Response Text Path (optional)</label>
          <input
            type="text"
            value={responseTextPath}
            onChange={event => setResponseTextPath(event.target.value)}
            placeholder="choices.0.message.content"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Headers</label>
          <button
            type="button"
            onClick={addHeaderPair}
            className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5"
          >
            Add Header
          </button>
        </div>
        <div className="space-y-2">
          {headerPairs.map(pair => (
            <div key={pair.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="text"
                value={pair.key}
                onChange={event => updateHeaderPair(pair.id, 'key', event.target.value)}
                placeholder="Header name"
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
              <input
                type="text"
                value={pair.value}
                onChange={event => updateHeaderPair(pair.id, 'value', event.target.value)}
                placeholder="Header value"
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
              <button
                type="button"
                onClick={() => removeHeaderPair(pair.id)}
                className="px-2 py-2 rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5"
                title="Remove header"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Payload Template (JSON object)</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => insertPayloadToken('{{prompt}}')}
              className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5"
            >
              Insert prompt token
            </button>
          </div>
        </div>
        <textarea
          value={payloadText}
          onChange={event => setPayloadText(event.target.value)}
          rows={8}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm font-medium">Connection Check</div>
          <button
            type="button"
            onClick={() => void validateExternalConnection()}
            disabled={isValidatingConnection || endpoint.trim().length === 0}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm border transition-all',
              !isValidatingConnection && endpoint.trim().length > 0
                ? 'border-border bg-background hover:bg-white/10 dark:hover:bg-white/5'
                : 'border-border bg-background text-muted-foreground cursor-not-allowed',
            )}
          >
            {isValidatingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        {connectionCheck?.ok && (
          <div className="text-xs text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-md px-2 py-1">
            Connected successfully. Extracted output: {connectionCheck.output}
          </div>
        )}
        {connectionCheck && !connectionCheck.ok && (
          <div className="text-xs text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-md px-2 py-1">
            Connection failed: {connectionCheck.error}
          </div>
        )}
      </div>
    </>
  );

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
                          openCreateFromTest(test);
                        }}
                        className="px-1 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Duplicate configuration"
                      >
                        <Copy className="w-3.5 h-3.5" />
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
                  <div className="w-full inline-flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Configuration</h2>
                      <p className="text-sm text-muted-foreground">Current test setup</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {chatMessages.length === 0 && (
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedTest)}
                          className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5 inline-flex items-center gap-1.5"
                          title="Edit this test configuration"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openCreateFromTest(selectedTest)}
                        className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5 inline-flex items-center gap-1.5"
                        title="Duplicate this test configuration"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteTest(selectedTest.id)}
                        className="px-3 py-1.5 text-sm rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 inline-flex items-center gap-1.5"
                        title="Delete this test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfig(prev => !prev)}
                        className="p-2 rounded-md border border-border bg-background hover:bg-white/10 dark:hover:bg-white/5"
                        title={showConfig ? 'Hide configuration' : 'Show configuration'}
                      >
                        <ChevronDown className={cn('w-5 h-5 transition-transform', showConfig ? 'rotate-180' : 'rotate-0')} />
                      </button>
                    </div>
                  </div>

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
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Response Text Path</div>
                            <div className="font-medium break-words">{selectedTest.model.response_text_path || '(auto)'}</div>
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

                {selectedTest.runner.type === 'framework' ? (
                  <div className="glass-strong p-6 rounded-xl space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Garak Framework Scan</h2>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Probe: {GARAK_PROBES.find(p => p.id === (selectedTest.runner.probe_spec ?? 'dan.AutoDANCached'))?.label ?? (selectedTest.runner.probe_spec ?? 'dan.AutoDANCached')}
                        </div>
                      </div>
                      <button
                        onClick={() => void runTest()}
                        disabled={!canRunTest}
                        className={cn(
                          'px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2',
                          canRunTest
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                        )}
                      >
                        <Send className="w-4 h-4" />
                        Run Scan
                      </button>
                    </div>

                    {GARAK_PROBES.find(p => p.id === (selectedTest.runner.probe_spec ?? 'dan.AutoDANCached'))?.speed === 'slow' && (
                      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex gap-2 items-start">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-medium">Slow probe — sequential only.</span>{' '}
                          All {GARAK_PROBES.find(p => p.id === (selectedTest.runner.probe_spec ?? 'dan.AutoDANCached'))?.estimatedCalls} calls run one-by-one and may take several minutes.
                        </span>
                      </div>
                    )}

                    {isRunning && (
                      <div className="flex items-center gap-3 py-2 text-muted-foreground">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </span>
                        <span key={loadingMessage} className="text-sm animate-in fade-in duration-500">{loadingMessage}</span>
                      </div>
                    )}

                    {/* Run history */}
                    {loadingRuns ? (
                      <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </span>
                        Loading scan history...
                      </div>
                    ) : frameworkRuns.length === 0 ? (
                      !isRunning && (
                        <div className="text-sm text-muted-foreground py-4">
                          No scans run yet. Click Run Scan to start.
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {frameworkRuns.length} scan{frameworkRuns.length !== 1 ? 's' : ''} recorded
                        </div>
                        {frameworkRuns.map(run => {
                          const isExpanded = selectedRunId === run.run_id;
                          const probeLabel = GARAK_PROBES.find(p => p.id === run.probe_spec)?.label ?? run.probe_spec;
                          const total = run.attempts?.length ?? 0;
                          const blocked = run.attempts?.filter(a => a.blocked).length ?? 0;
                          const reached = total - blocked;
                          const runAttempts = expandedRunAttempts[run.run_id] ?? new Set<number>();
                          return (
                            <div key={run.run_id} className="rounded-xl border border-border overflow-hidden">
                              {/* Card header */}
                              <button
                                onClick={() => setSelectedRunId(prev => prev === run.run_id ? null : run.run_id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-background/50 hover:bg-background/80 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {run.analysis.flagged ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{probeLabel}</div>
                                    <div className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  {total > 0 && (
                                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="text-green-600 dark:text-green-400 font-medium">{blocked} blocked</span>
                                      <span>/</span>
                                      <span className="text-red-600 dark:text-red-400 font-medium">{reached} reached</span>
                                    </div>
                                  )}
                                  <span className={cn(
                                    'text-xs font-semibold px-2 py-0.5 rounded',
                                    run.analysis.flagged
                                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                      : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                                  )}>
                                    {run.analysis.flagged ? 'Risk Detected' : 'Safe'}
                                  </span>
                                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded ? 'rotate-180' : '')} />
                                </div>
                              </button>

                              {/* Expanded analysis */}
                              {isExpanded && (
                                <div className="border-t border-border bg-background/20 p-4 space-y-4">
                                  {/* Safe/flagged banner */}
                                  <div className={cn(
                                    'p-3 rounded-lg flex items-start gap-3',
                                    run.analysis.flagged
                                      ? 'bg-red-500/10 border border-red-500/30'
                                      : 'bg-green-500/10 border border-green-500/30',
                                  )}>
                                    {run.analysis.flagged
                                      ? <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                      : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    }
                                    <div>
                                      <div className={cn('font-semibold text-sm', run.analysis.flagged ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>
                                        {run.analysis.flagged ? 'Prompt Injection Detected' : 'Safe Prompt'}
                                      </div>
                                      <div className="text-xs opacity-80 mt-0.5">{run.analysis.reason}</div>
                                    </div>
                                  </div>

                                  {/* Risk score */}
                                  <div>
                                    <div className="text-sm font-medium mb-1.5">Risk Score</div>
                                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className={cn('h-2 rounded-full', run.analysis.score > 0.7 ? 'bg-red-600' : run.analysis.score > 0.4 ? 'bg-yellow-600' : 'bg-green-600')}
                                        style={{ width: `${run.analysis.score * 100}%` }}
                                      />
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">{(run.analysis.score * 100).toFixed(1)}%</div>
                                  </div>

                                  {run.report_html_url && (
                                    <a
                                      href={`http://localhost:8000${run.report_html_url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      <Download className="w-4 h-4" />
                                      View Full Garak Report
                                    </a>
                                  )}

                                  {/* Breakdown chart */}
                                  {total > 0 && (() => {
                                    const compromisedCount = run.attempts?.filter(a => !a.blocked && a.compromised).length ?? 0;
                                    const handledCount = run.attempts?.filter(a => !a.blocked && !a.compromised).length ?? 0;
                                    const blockedPct = (blocked / total) * 100;
                                    const handledPct = (handledCount / total) * 100;
                                    const compromisedPct = (compromisedCount / total) * 100;
                                    return (
                                      <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
                                        <div className="text-sm font-medium">Probe Outcome Breakdown</div>
                                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                                          {blocked > 0 && <div className="h-full bg-green-500" style={{ width: `${blockedPct}%` }} title={`Blocked by filter: ${blocked}`} />}
                                          {handledCount > 0 && <div className="h-full bg-amber-400" style={{ width: `${handledPct}%` }} title={`Reached model – handled: ${handledCount}`} />}
                                          {compromisedCount > 0 && <div className="h-full bg-red-500" style={{ width: `${compromisedPct}%` }} title={`Compromised: ${compromisedCount}`} />}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                            <div>
                                              <div className="text-xs text-muted-foreground">Blocked</div>
                                              <div className="text-base font-bold text-green-700 dark:text-green-400 leading-none">{blocked}</div>
                                              <div className="text-xs text-muted-foreground">{blockedPct.toFixed(0)}%</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                            <div>
                                              <div className="text-xs text-muted-foreground">Handled</div>
                                              <div className="text-base font-bold text-amber-700 dark:text-amber-400 leading-none">{handledCount}</div>
                                              <div className="text-xs text-muted-foreground">{handledPct.toFixed(0)}%</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                            <div>
                                              <div className="text-xs text-muted-foreground">Compromised</div>
                                              <div className="text-base font-bold text-red-700 dark:text-red-400 leading-none">{compromisedCount}</div>
                                              <div className="text-xs text-muted-foreground">{compromisedPct.toFixed(0)}%</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Attempt accordion */}
                                  {run.attempts && run.attempts.length > 0 && (
                                    <div>
                                      <div className="text-sm font-medium mb-2">Test Prompts ({run.attempts.length})</div>
                                      <div className="space-y-1.5">
                                        {run.attempts.map((attempt, i) => {
                                          const isAttemptOpen = runAttempts.has(i);
                                          const tier = attempt.blocked ? 'blocked' : attempt.compromised ? 'compromised' : 'handled';
                                          const tierBorder = tier === 'blocked' ? 'border-green-300 dark:border-green-800' : tier === 'handled' ? 'border-amber-300 dark:border-amber-700' : 'border-red-300 dark:border-red-800';
                                          const tierBg = tier === 'blocked' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : tier === 'handled' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
                                          const tierBadge = tier === 'blocked' ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100' : tier === 'handled' ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100' : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100';
                                          const tierLabel = tier === 'blocked' ? 'Blocked' : tier === 'handled' ? 'Handled' : 'Compromised';
                                          return (
                                            <div key={i} className={cn('rounded-lg border text-sm overflow-hidden', tierBorder)}>
                                              <button
                                                onClick={() => {
                                                  setExpandedRunAttempts(prev => {
                                                    const cur = new Set(prev[run.run_id] ?? []);
                                                    if (cur.has(i)) cur.delete(i); else cur.add(i);
                                                    return { ...prev, [run.run_id]: cur };
                                                  });
                                                }}
                                                className={cn('w-full flex items-center justify-between px-3 py-2 text-left', tierBg)}
                                              >
                                                <div className="flex flex-col min-w-0 gap-0.5">
                                                  <span className="font-medium text-xs uppercase tracking-wide opacity-60">
                                                    {attempt.goal ?? `Prompt #${i + 1}`}
                                                  </span>
                                                  <span className="truncate text-xs opacity-70">{attempt.prompt.slice(0, 80)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                  <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', tierBadge)}>
                                                    {tierLabel}
                                                  </span>
                                                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isAttemptOpen ? 'rotate-180' : '')} />
                                                </div>
                                              </button>
                                              {isAttemptOpen && (
                                                <div className="px-3 py-3 bg-background space-y-3 border-t border-inherit">
                                                  {attempt.goal && (
                                                    <div className="text-xs text-muted-foreground">
                                                      <span className="font-semibold uppercase tracking-wide">Goal:</span>{' '}
                                                      {attempt.goal}
                                                    </div>
                                                  )}
                                                  <div>
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Input</div>
                                                    <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded p-2">{attempt.prompt}</pre>
                                                  </div>
                                                  <div>
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                      Output
                                                      {attempt.statuses.length > 1 && (
                                                        <span className="ml-1 font-normal opacity-60">(evaluated by {attempt.statuses.length} detectors)</span>
                                                      )}
                                                    </div>
                                                    {attempt.blocked ? (
                                                      <div className="text-xs text-green-700 dark:text-green-400 italic bg-green-50 dark:bg-green-900/20 rounded p-2">
                                                        Blocked by content filter — no response returned.
                                                      </div>
                                                    ) : (
                                                      <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded p-2">{attempt.output ?? '(empty)'}</pre>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
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
                                <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
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
                )}

                {runResult && !isFrameworkTest && (
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
                    {runResult.report_html_url && (
                      <a
                        href={`http://localhost:8000${runResult.report_html_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
                      >
                        <Download className="w-4 h-4" />
                        View Full Garak Report
                      </a>
                    )}

                    {runResult.attempts && runResult.attempts.length > 0 && (() => {
                      const total = runResult.attempts!.length;
                      const blocked = runResult.attempts!.filter(a => a.blocked).length;
                      const reached = total - blocked;
                      const blockedPct = (blocked / total) * 100;
                      const reachedPct = (reached / total) * 100;
                      return (
                        <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
                          <div className="text-sm font-medium">Probe Outcome Breakdown</div>

                          {/* Stacked bar */}
                          <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                            {blocked > 0 && (
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${blockedPct}%` }}
                                title={`Blocked: ${blocked}`}
                              />
                            )}
                            {reached > 0 && (
                              <div
                                className="h-full bg-red-500 transition-all"
                                style={{ width: `${reachedPct}%` }}
                                title={`Reached model: ${reached}`}
                              />
                            )}
                          </div>

                          {/* Legend + counts */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Blocked</div>
                                <div className="text-lg font-bold text-green-700 dark:text-green-400 leading-none">{blocked}</div>
                                <div className="text-xs text-muted-foreground">{blockedPct.toFixed(0)}% of prompts</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Reached model</div>
                                <div className="text-lg font-bold text-red-700 dark:text-red-400 leading-none">{reached}</div>
                                <div className="text-xs text-muted-foreground">{reachedPct.toFixed(0)}% of prompts</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {runResult.attempts && runResult.attempts.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Test Prompts ({runResult.attempts.length})
                        </div>
                        <div className="space-y-1.5">
                          {runResult.attempts.map((attempt, i) => {
                            const isOpen = expandedAttempts.has(i);
                            return (
                              <div
                                key={i}
                                className={cn(
                                  'rounded-lg border text-sm overflow-hidden',
                                  attempt.blocked
                                    ? 'border-green-300 dark:border-green-800'
                                    : 'border-red-300 dark:border-red-800',
                                )}
                              >
                                <button
                                  onClick={() => {
                                    setExpandedAttempts(prev => {
                                      const next = new Set(prev);
                                      if (next.has(i)) next.delete(i);
                                      else next.add(i);
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    'w-full flex items-center justify-between px-3 py-2 text-left',
                                    attempt.blocked
                                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300',
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium shrink-0">Prompt #{i + 1}</span>
                                    <span className="truncate text-xs opacity-70">{attempt.prompt.slice(0, 72)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs opacity-60">{attempt.statuses.length} run{attempt.statuses.length !== 1 ? 's' : ''}</span>
                                    <span className={cn(
                                      'text-xs font-semibold px-1.5 py-0.5 rounded',
                                      attempt.blocked
                                        ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                                        : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100',
                                    )}>
                                      {attempt.blocked ? 'Blocked' : 'Reached model'}
                                    </span>
                                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen ? 'rotate-180' : '')} />
                                  </div>
                                </button>
                                {isOpen && (
                                  <div className="px-3 py-3 bg-background space-y-3 border-t border-inherit">
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Input</div>
                                      <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded p-2">{attempt.prompt}</pre>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Output
                                        {attempt.statuses.length > 1 && (
                                          <span className="ml-1 font-normal opacity-60">
                                            (same response evaluated by {attempt.statuses.length} detectors)
                                          </span>
                                        )}
                                      </div>
                                      {attempt.blocked ? (
                                        <div className="text-xs text-green-700 dark:text-green-400 italic bg-green-50 dark:bg-green-900/20 rounded p-2">
                                          Blocked by content filter — no response returned.
                                        </div>
                                      ) : (
                                        <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded p-2">{attempt.output ?? '(empty)'}</pre>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                  <h2 className="text-xl font-semibold">{editingTestId ? 'Edit Test Setup' : 'Create Test Setup'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {editingTestId ? 'Update the test configuration. Changes take effect immediately.' : 'Configure model, runner, and request shape before creating the test.'}
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
                <div
                  className={cn(
                    'rounded-lg border border-border/60 bg-background/40 p-3',
                    savedConfigs.length === 0 && !loadingConfigs ? 'opacity-60 pointer-events-none' : '',
                  )}
                >
                  <div className="text-sm text-muted-foreground mb-2">Saved Configurations</div>
                  <div className="relative flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                      value={selectedConfigId}
                      onChange={event => setSelectedConfigId(event.target.value)}
                      disabled={loadingConfigs || savedConfigs.length === 0}
                      className="flex-1 min-w-0 h-9 px-3 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                    >
                      {savedConfigs.length === 0 ? (
                        <option value="">{loadingConfigs ? 'Loading saved configurations...' : 'No configurations saved yet'}</option>
                      ) : (
                        savedConfigs.map(config => (
                          <option key={config.id} value={config.id}>
                            {config.name}
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={loadSelectedConfiguration}
                      disabled={savedConfigs.length === 0}
                      className={cn(
                        'h-9 px-3 rounded-lg border transition-all inline-flex items-center gap-1.5 justify-center text-sm whitespace-nowrap',
                        savedConfigs.length > 0
                          ? 'border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5'
                          : 'border-border bg-background text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Apply
                    </button>

                    <div ref={configActionsRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowConfigActionsMenu(prev => !prev)}
                        disabled={savedConfigs.length === 0}
                        className={cn(
                          'h-9 px-3 rounded-lg border transition-all inline-flex items-center gap-1.5 justify-center text-sm whitespace-nowrap',
                          savedConfigs.length > 0
                            ? 'border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5'
                            : 'border-border bg-background text-muted-foreground cursor-not-allowed',
                        )}
                      >
                        Actions
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showConfigActionsMenu ? 'rotate-180' : 'rotate-0')} />
                      </button>

                      {showConfigActionsMenu && savedConfigs.length > 0 && (
                        <div className="absolute top-full right-0 mt-1 z-20 w-40 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfigActionsMenu(false);
                              prepareUpdateConfiguration();
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 dark:hover:bg-white/5"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfigActionsMenu(false);
                              prepareDuplicateConfiguration();
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 dark:hover:bg-white/5"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfigActionsMenu(false);
                              void deleteSelectedConfiguration();
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Select a configuration and click Apply, or use Actions for update/duplicate/delete.
                    </p>
                  </div>

                  {savedConfigs.length === 0 && !loadingConfigs && (
                    <p className="text-xs text-muted-foreground mt-2">No saved configurations yet. Use "Save as Configuration" below.</p>
                  )}
                </div>

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
                      onClick={() => switchModelType('platform')}
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
                      onClick={() => switchModelType('external')}
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

                    {runnerType === 'framework' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Probe</label>
                          <select
                            value={probeSpec}
                            onChange={event => setProbeSpec(event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                          >
                            <optgroup label="Fast (parallel)">
                              {GARAK_PROBES.filter(p => p.speed === 'fast').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} call{probe.estimatedCalls !== 1 ? 's' : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Medium (parallel)">
                              {GARAK_PROBES.filter(p => p.speed === 'medium').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} calls
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Slow (sequential — parallel_attempts has no effect)">
                              {GARAK_PROBES.filter(p => p.speed === 'slow').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} calls
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Custom">
                              <option value={CUSTOM_PROBE_ID}>Custom probe spec…</option>
                            </optgroup>
                          </select>
                          {probeSpec === CUSTOM_PROBE_ID ? (
                            <input
                              type="text"
                              value={customProbeSpec}
                              onChange={event => setCustomProbeSpec(event.target.value)}
                              placeholder="e.g. lmrc.Profanity or encoding.InjectBase64,dan.DanInTheWild"
                              className="mt-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 font-mono"
                            />
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {GARAK_PROBES.find(p => p.id === probeSpec)?.description}
                            </p>
                          )}
                        </div>

                        {GARAK_PROBES.find(p => p.id === probeSpec)?.speed === 'slow' && (
                          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium">Slow probe — sequential only.</span> This probe cannot be parallelised by garak. All {GARAK_PROBES.find(p => p.id === probeSpec)?.estimatedCalls} calls run one-by-one and may take several minutes.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  renderExternalConfiguration()
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
                    onClick={openSaveConfigurationDialog}
                    disabled={!canSaveConfiguration || isSavingConfig}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2',
                      canSaveConfiguration && !isSavingConfig
                        ? 'bg-background border border-border text-foreground hover:bg-white/10 dark:hover:bg-white/5'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {isSavingConfig ? 'Saving...' : 'Save as Configuration'}
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
                    {isCreating ? (editingTestId ? 'Saving...' : 'Creating...') : (editingTestId ? 'Save Changes' : 'Create Test')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showManageConfigModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[55] p-4">
            <div className="glass-strong rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/60 dark:border-white/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {saveConfigMode === 'update' ? 'Update Configuration' : 'Duplicate Configuration'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Edit the configuration values here, then confirm with the button below.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowManageConfigModal(false);
                    setShowCreateModal(true);
                    restoreCreateFormSnapshot();
                    setCreateFormSnapshot(null);
                    setSaveConfigMode('create');
                  }}
                  className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-white/10 dark:hover:bg-white/5"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Configuration Name</label>
                  <input
                    type="text"
                    value={configNameDraft}
                    onChange={event => setConfigNameDraft(event.target.value)}
                    placeholder="e.g., External Anthropic Baseline"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model Source</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => switchModelType('platform')}
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
                      onClick={() => switchModelType('external')}
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
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Mitigations</label>
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
                        </div>
                      </>
                    )}

                    {runnerType === 'framework' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Probe</label>
                          <select
                            value={probeSpec}
                            onChange={event => setProbeSpec(event.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                          >
                            <optgroup label="Fast (parallel)">
                              {GARAK_PROBES.filter(p => p.speed === 'fast').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} call{probe.estimatedCalls !== 1 ? 's' : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Medium (parallel)">
                              {GARAK_PROBES.filter(p => p.speed === 'medium').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} calls
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Slow (sequential — parallel_attempts has no effect)">
                              {GARAK_PROBES.filter(p => p.speed === 'slow').map(probe => (
                                <option key={probe.id} value={probe.id}>
                                  {probe.label} — {probe.estimatedCalls} calls
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Custom">
                              <option value={CUSTOM_PROBE_ID}>Custom probe spec…</option>
                            </optgroup>
                          </select>
                          {probeSpec === CUSTOM_PROBE_ID ? (
                            <input
                              type="text"
                              value={customProbeSpec}
                              onChange={event => setCustomProbeSpec(event.target.value)}
                              placeholder="e.g. lmrc.Profanity or encoding.InjectBase64,dan.DanInTheWild"
                              className="mt-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 font-mono"
                            />
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {GARAK_PROBES.find(p => p.id === probeSpec)?.description}
                            </p>
                          )}
                        </div>

                        {GARAK_PROBES.find(p => p.id === probeSpec)?.speed === 'slow' && (
                          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium">Slow probe — sequential only.</span> This probe cannot be parallelised by garak. All {GARAK_PROBES.find(p => p.id === probeSpec)?.estimatedCalls} calls run one-by-one and may take several minutes.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  renderExternalConfiguration()
                )}

                {saveConfigError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {saveConfigError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowManageConfigModal(false);
                      setShowCreateModal(true);
                      restoreCreateFormSnapshot();
                      setCreateFormSnapshot(null);
                      setSaveConfigMode('create');
                    }}
                    className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void saveFromManageModal()}
                    disabled={!canSaveConfiguration || isSavingConfig}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2',
                      canSaveConfiguration && !isSavingConfig
                        ? 'bg-background border border-border text-foreground hover:bg-white/10 dark:hover:bg-white/5'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {isSavingConfig
                      ? 'Saving...'
                      : saveConfigMode === 'update'
                        ? 'Update Configuration'
                        : 'Duplicate Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSaveConfigModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="glass-strong rounded-xl w-full max-w-md border border-white/60 dark:border-white/10 p-5">
              <h3 className="text-lg font-semibold">
                {saveConfigMode === 'update'
                  ? 'Update Configuration'
                  : saveConfigMode === 'duplicate'
                    ? 'Duplicate Configuration'
                    : 'Save Configuration'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {saveConfigMode === 'update'
                  ? 'This updates the selected configuration using the current values in the create-test modal.'
                  : saveConfigMode === 'duplicate'
                    ? 'This creates a new configuration using the values currently prefilled in the create-test modal.'
                    : 'Choose a name for this reusable configuration.'}
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Configuration Name</label>
                <input
                  type="text"
                  value={configNameDraft}
                  onChange={event => setConfigNameDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !isSavingConfig) {
                      void confirmSaveConfiguration();
                    }
                  }}
                  placeholder="e.g., Anthropic External Baseline"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-600"
                  autoFocus
                />
              </div>

              {saveConfigError && (
                <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {saveConfigError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowSaveConfigModal(false);
                    setSaveConfigError(null);
                    setSaveConfigMode('create');
                  }}
                  disabled={isSavingConfig}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void confirmSaveConfiguration()}
                  disabled={isSavingConfig}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium transition-all',
                    !isSavingConfig
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
                  )}
                >
                  {isSavingConfig
                    ? 'Saving...'
                    : saveConfigMode === 'update'
                      ? 'Update Configuration'
                      : saveConfigMode === 'duplicate'
                        ? 'Duplicate Configuration'
                        : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
