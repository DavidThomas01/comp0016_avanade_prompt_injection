import { useState } from 'react';
import { Send, Copy, RefreshCw, Loader } from 'lucide-react';
import { mitigations } from '../data/mitigations';
import { enhancePrompt, PromptEnhancementResponse } from '../api/promptEnhancerClient';

export function PromptEnhancerPage() {
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enhancementResult, setEnhancementResult] = useState<PromptEnhancementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id]
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl mb-2">Prompt Enhancer</h1>
          <p className="text-gray-700">
            Enhance your system prompts with security mitigations to protect against prompt injection attacks.
            Your prompt will be restructured for clarity, mitigations will be prepended, and the result will be verified.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Mitigations */}
          <div className="bg-white border border-gray-200 rounded">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Available Mitigations</h2>
              <p className="text-xs text-gray-500 mt-1">Select mitigations to apply to your prompt</p>
            </div>
            
            <div className="p-4 space-y-3">
              {mitigations.map((mitigation) => (
                <div
                  key={mitigation.id}
                  onClick={() => toggleMitigation(mitigation.id)}
                  className={`p-3 border-2 rounded cursor-pointer transition-all ${
                    selectedMitigations.includes(mitigation.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedMitigations.includes(mitigation.id)
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {selectedMitigations.includes(mitigation.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{mitigation.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{mitigation.description}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-3 bg-gray-100 rounded">
                <div className="text-sm font-medium mb-2">Selected Mitigations</div>
                <div className="text-2xl font-bold text-orange-500">
                  {selectedMitigations.length} / {mitigations.length}
                </div>
              </div>
            </div>
          </div>
          
          {/* Middle Panel - System Prompt Input */}
          <div className="bg-white border border-gray-200 rounded">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">System Prompt</h2>
              <p className="text-xs text-gray-500 mt-1">Enter your base system prompt</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Enter your system prompt:</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful AI assistant that provides accurate and safe responses..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono resize-none"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={generateEnhancedPrompt}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-2 rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enhance Prompt</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 py-2 rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-xs font-medium text-red-900 mb-1">⚠️ Error</div>
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs font-medium text-blue-900 mb-1">💡 How it works</div>
                <p className="text-xs text-blue-800">
                  1. Your prompt is restructured for clarity<br/>
                  2. Security mitigations are prepended<br/>
                  3. The result is verified for quality
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Panel - All Three Outputs */}
          <div className="bg-white border border-gray-200 rounded">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Results</h2>
              <p className="text-xs text-gray-500 mt-1">Original → Improved → Enhanced</p>
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
