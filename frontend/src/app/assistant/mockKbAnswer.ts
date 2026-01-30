import { mitigations } from '../data/mitigations';
import { vulnerabilities } from '../data/vulnerabilities';
import {
  ChatAssistantReply,
  ChatRelatedMitigation,
  ChatRelatedVulnerability,
} from './types';

const MIN_TOKEN_LENGTH = 3;

const COMMON_SUGGESTIONS = [
  'Explain direct vs indirect prompt injection',
  'How does instruction-data boundary confusion happen?',
  'What mitigations help against tool-use injection?',
  'Summarize risks of memory and long-horizon attacks',
];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= MIN_TOKEN_LENGTH);
}

function scoreTokens(tokens: string[], haystack: string, weight: number) {
  const lower = haystack.toLowerCase();
  let score = 0;
  tokens.forEach(token => {
    if (lower.includes(token)) {
      score += weight;
    }
  });
  return score;
}

function scoreVulnerability(tokens: string[], vulnerabilityText: string) {
  return scoreTokens(tokens, vulnerabilityText, 2);
}

function scoreMitigation(tokens: string[], mitigationText: string) {
  return scoreTokens(tokens, mitigationText, 2);
}

export async function mockKbAnswer(question: string): Promise<ChatAssistantReply> {
  const tokens = tokenize(question);

  const vulnerabilityMatches = vulnerabilities
    .map(vulnerability => {
      const searchable = [
        vulnerability.name,
        vulnerability.description,
        vulnerability.code,
        vulnerability.tags.join(' '),
        vulnerability.nuggets.join(' '),
        vulnerability.technicalExplanation.join(' '),
        vulnerability.exampleAttack.goal,
        vulnerability.exampleAttack.steps.join(' '),
      ].join(' ');

      return {
        vulnerability,
        score: scoreVulnerability(tokens, searchable),
      };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const mitigationMatches = mitigations
    .map(mitigation => {
      const searchable = [
        mitigation.name,
        mitigation.description,
        mitigation.strategy,
        mitigation.defenseFlow.join(' '),
        mitigation.implementation,
      ].join(' ');

      return {
        mitigation,
        score: scoreMitigation(tokens, searchable),
      };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const relatedVulnerabilities: ChatRelatedVulnerability[] = vulnerabilityMatches.map(
    match => ({
      id: match.vulnerability.id,
      name: match.vulnerability.name,
    })
  );

  const relatedMitigations: ChatRelatedMitigation[] = mitigationMatches.map(match => ({
    id: match.mitigation.id,
    name: match.mitigation.name,
    description: match.mitigation.description,
  }));

  const topScore = Math.max(
    vulnerabilityMatches[0]?.score ?? 0,
    mitigationMatches[0]?.score ?? 0
  );

  const confidence =
    topScore >= 6 ? 'high' : topScore >= 3 ? 'medium' : 'low';

  if (relatedVulnerabilities.length === 0 && relatedMitigations.length === 0) {
    return {
      text:
        'I can help with our prompt-injection knowledge base. Try asking about a vulnerability type, a mitigation, or how a specific attack works.',
      confidence: 'low',
      relatedVulnerabilities: [],
      relatedMitigations: [],
      suggestions: COMMON_SUGGESTIONS,
    };
  }

  const summaryParts = [];
  if (relatedVulnerabilities.length > 0) {
    summaryParts.push(
      `I found ${relatedVulnerabilities.length} relevant vulnerability${
        relatedVulnerabilities.length === 1 ? '' : 'ies'
      } in the knowledge base.`
    );
  }
  if (relatedMitigations.length > 0) {
    summaryParts.push(
      `I also found ${relatedMitigations.length} mitigation${
        relatedMitigations.length === 1 ? '' : 's'
      } that map to your question.`
    );
  }

  return {
    text: summaryParts.join(' '),
    confidence,
    relatedVulnerabilities,
    relatedMitigations,
    suggestions:
      confidence === 'low'
        ? COMMON_SUGGESTIONS
        : [
            'Show me examples of this attack',
            'What defenses reduce this risk?',
            'How would this impact a RAG pipeline?',
          ],
  };
}
