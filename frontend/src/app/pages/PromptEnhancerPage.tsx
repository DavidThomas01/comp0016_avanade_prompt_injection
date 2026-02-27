import { Send, Copy, RefreshCw, Loader, Sparkles, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { mitigations } from '../data/mitigations';
import { enhancePrompt, PromptEnhancementResponse } from '../api/promptEnhancerClient';

export function PromptEnhancerPage() {
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enhancementResult, setEnhancementResult] = useState<PromptEnhancementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = selectedMitigations.length;
  const mitigationCards = useMemo(() => mitigations, []);
  
  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };
  
  const generateEnhancedPrompt = async () => {
    if (!systemPrompt.trim()) {
      setError('Please enter a system prompt to enhance.');
      return;
    }

    if (selectedMitigations.length === 0) {
      setError('Please select at least one mitigation to apply.');
      return;
    }

    setLoading(true);
    setError(null);
    setEnhancementResult(null);

    try {
      const result = await enhancePrompt(systemPrompt, selectedMitigations);
      setEnhancementResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetForm = () => {
    setSystemPrompt('');
    setEnhancementResult(null);
    setSelectedMitigations([]);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-gray-700">
            <Sparkles className="h-3.5 w-3.5 text-orange-600" />
            Prompt hardening helper
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Prompt Enhancer</span>
          </h1>
          <p className="text-gray-700 mt-2">
            Enhance your system prompts with security mitigations to protect against prompt injection attacks.
            Your prompt will be restructured for clarity, mitigations will be prepended, and the result will be verified.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Mitigations */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Available Mitigations</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Select mitigations to include in your prompt
                  </p>
                </div>
                <div className="text-xs text-gray-700 px-3 py-1 rounded-full bg-white/60 border border-white/60">
                  {selectedCount} selected
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {mitigationCards.map((mitigation) => {
                const active = selectedMitigations.includes(mitigation.id);
                return (
                  <button
                    key={mitigation.id}
                    type="button"
                    onClick={() => toggleMitigation(mitigation.id)}
                    className={`w-full text-left rounded-2xl p-4 border transition-all focus-ring ${
                      active
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-white/40 border-white/60 hover:bg-white/70 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {mitigation.name}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                          {mitigation.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {active ? (
                          <CheckCircle2 className="h-5 w-5 text-orange-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-gray-900/15 bg-white/60" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle: Input */}
          <div className="glass-strong rounded-3xl border border-white/60 p-6">
            <h2 className="text-lg font-semibold mb-2">Your System Prompt</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste your system prompt here, then generate an enhanced version with the selected mitigations.
            </p>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter your system prompt..."
              className="w-full h-[320px] resize-none rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-ring"
              disabled={loading}
            />

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={generateEnhancedPrompt}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-ring"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/80 transition-all focus-ring"
              >
                <RefreshCw className="h-4 w-4 text-gray-700" />
                Reset
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-medium text-red-900 mb-1">⚠️ Error</div>
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs font-medium text-blue-900 mb-1">💡 How it works</div>
              <p className="text-xs text-blue-800">
                1. Your prompt is restructured for clarity<br />
                2. Security mitigations are prepended<br />
                3. The result is verified for quality
              </p>
            </div>
          </div>
          
          {/* Right Panel - All Three Outputs */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Results</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Original → Improved → Enhanced
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => enhancementResult && copyToClipboard(enhancementResult.enhancedPrompt)}
                  disabled={!enhancementResult}
                  className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border transition-all focus-ring ${
                    enhancementResult
                      ? 'bg-white/60 border-white/60 text-gray-800 hover:bg-white/80'
                      : 'bg-white/40 border-white/60 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[800px] overflow-y-auto">
              {enhancementResult ? (
                <>
                  {/* Original Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-700">Original Prompt</div>
                      <button
                        onClick={() => copyToClipboard(enhancementResult.originalPrompt)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono max-h-[120px] overflow-y-auto">
                      {enhancementResult.originalPrompt}
                    </div>
                  </div>

                  {/* Improved Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-blue-700">Improved Prompt</div>
                      <button
                        onClick={() => copyToClipboard(enhancementResult.improvedPrompt)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs font-mono max-h-[120px] overflow-y-auto">
                      {enhancementResult.improvedPrompt}
                    </div>
                  </div>

                  {/* Enhanced Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-green-700">Final Enhanced Prompt</div>
                      <button
                        onClick={() => copyToClipboard(enhancementResult.enhancedPrompt)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-xs font-mono max-h-[120px] overflow-y-auto">
                      {enhancementResult.enhancedPrompt}
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className={`p-3 rounded border-2 ${
                    enhancementResult.verificationData.verdict === 'PASS'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}>
                      {enhancementResult.verificationData.verdict === 'PASS' ? '✓ Verification Passed' : '✗ Verification Failed'}
                    </div>
                    <div className={`text-xs ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}>
                      {enhancementResult.verificationData.explanation}
                    </div>
                    
                    {enhancementResult.verificationData.issues.length > 0 && (
                      <div className="mt-2 text-xs">
                        <div className="font-medium mb-1">Issues:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {enhancementResult.verificationData.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-600">
                      Completed in {enhancementResult.attempts} attempt{enhancementResult.attempts !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Applied Mitigations */}
                  {selectedMitigations.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 mb-2 font-medium">Applied Mitigations:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMitigations.map((mitId) => {
                          const m = mitigations.find(mit => mit.id === mitId);
                          return (
                            <span key={mitId} className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                              {m?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Enter a prompt and select mitigations to enhance</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}