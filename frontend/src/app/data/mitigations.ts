export interface Mitigation {
  id: string;
  name: string;
  description: string;
  strategy: string;
  metrics: {
    label: string;
    value: number;
    color: string;
  }[];
  defenseFlow: string[];
  implementation: string;
}

export const mitigations: Mitigation[] = [
  {
    id: 'input-validation',
    name: 'Input Validation',
    description: 'Multi-layer input validation with pattern detection and semantic analysis',
    strategy: 'Multi-layer input validation with pattern detection and semantic analysis',
    metrics: [
      { label: 'Tests Passed', value: 95, color: 'bg-green-500' },
      { label: 'False Positives', value: 5, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 0, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Input Received',
      'Pattern Matching',
      'Semantic Analysis',
      'Safe Output'
    ],
    implementation: `function validateInput() {
  // Input validation logic here! (
    return processInput();
  }
  
  return processInput();
}`
  },
  {
    id: 'pattern-matching',
    name: 'Pattern Matching',
    description: 'Detect known attack patterns using signature-based detection',
    strategy: 'Signature-based detection of known attack patterns and malicious input sequences',
    metrics: [
      { label: 'Tests Passed', value: 88, color: 'bg-green-500' },
      { label: 'False Positives', value: 8, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 4, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Input Received',
      'Pattern Matching',
      'Threat Detection',
      'Block/Allow'
    ],
    implementation: `const patterns = [
  /ignore.*previous.*instructions/i,
  /system.*prompt/i,
  /you are.*DAN/i
];

function detectPatterns(input: string): boolean {
  return patterns.some(p => p.test(input));
}`
  },
  {
    id: 'blocklist-filtering',
    name: 'Blocklist Filtering',
    description: 'Filter requests based on known malicious phrases and keywords',
    strategy: 'Maintain and enforce a comprehensive blocklist of malicious phrases and keywords',
    metrics: [
      { label: 'Tests Passed', value: 82, color: 'bg-green-500' },
      { label: 'False Positives', value: 12, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 6, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Input Received',
      'Blocklist Filtering',
      'Content Sanitization',
      'Processed Output'
    ],
    implementation: `const blocklist = new Set([
  'ignore previous',
  'system prompt',
  'bypass safety'
]);

function filterBlocklist(text: string): boolean {
  return Array.from(blocklist).some(term => 
    text.toLowerCase().includes(term)
  );
}`
  },
  {
    id: 'delimiter-tokens',
    name: 'Delimiter Tokens',
    description: 'Use special tokens to separate system instructions from user input',
    strategy: 'Implement delimiter tokens to clearly separate trusted system instructions from untrusted user input',
    metrics: [
      { label: 'Tests Passed', value: 92, color: 'bg-green-500' },
      { label: 'False Positives', value: 3, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 5, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Input Received',
      'Token Injection',
      'Boundary Enforcement',
      'Safe Output'
    ],
    implementation: `const SYSTEM_DELIMITER = '<|SYSTEM|>';
const USER_DELIMITER = '<|USER|>';

function formatPrompt(system: string, user: string) {
  return \`\${SYSTEM_DELIMITER}\${system}\${USER_DELIMITER}\${user}\`;
}`
  },
  {
    id: 'output-sanitization',
    name: 'Output Sanitization',
    description: 'Sanitize model outputs to prevent data leakage and harmful content',
    strategy: 'Apply multi-layered sanitization to model outputs before returning to users',
    metrics: [
      { label: 'Tests Passed', value: 90, color: 'bg-green-500' },
      { label: 'False Positives', value: 7, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 3, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Model Output',
      'Content Scanning',
      'Sensitive Data Removal',
      'Clean Output'
    ],
    implementation: `function sanitizeOutput(output: string): string {
  // Remove PII patterns
  let clean = output.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
  
  // Remove API keys
  clean = clean.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
  
  return clean;
}`
  },
  {
    id: 'rate-limiting',
    name: 'Rate Limiting',
    description: 'Limit request frequency to prevent automated attacks',
    strategy: 'Implement rate limiting to prevent automated attack attempts and abuse',
    metrics: [
      { label: 'Tests Passed', value: 85, color: 'bg-green-500' },
      { label: 'False Positives', value: 10, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 5, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Request Received',
      'Rate Check',
      'Throttle/Allow',
      'Process Request'
    ],
    implementation: `const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string, limit = 10): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(userId) || [];
  
  const recent = requests.filter(t => now - t < 60000);
  return recent.length < limit;
}`
  },
  {
    id: 'anomaly-detection',
    name: 'Anomaly Detection',
    description: 'Detect unusual patterns and behaviors in user interactions',
    strategy: 'Use machine learning to identify anomalous patterns indicative of attacks',
    metrics: [
      { label: 'Tests Passed', value: 93, color: 'bg-green-500' },
      { label: 'False Positives', value: 4, color: 'bg-yellow-500' },
      { label: 'False Negatives', value: 3, color: 'bg-red-500' }
    ],
    defenseFlow: [
      'Behavior Analysis',
      'Anomaly Scoring',
      'Threshold Check',
      'Action Taken'
    ],
    implementation: `function detectAnomaly(input: string): number {
  let score = 0;
  
  // Check length anomalies
  if (input.length > 1000) score += 0.3;
  
  // Check repeated phrases
  const words = input.split(' ');
  const uniqueRatio = new Set(words).size / words.length;
  if (uniqueRatio < 0.5) score += 0.4;
  
  return score;
}`
  }
];
