export type ChatRole = 'user' | 'assistant';

export type ChatRelatedVulnerability = {
  id: string;
  name: string;
};

export type ChatRelatedMitigation = {
  id: string;
  name: string;
  description: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  related?: {
    confidence?: 'low' | 'medium' | 'high';
    vulnerabilities?: ChatRelatedVulnerability[];
    mitigations?: ChatRelatedMitigation[];
    suggestions?: string[];
  };
};

export type ChatAssistantReply = {
  text: string;
  confidence: 'low' | 'medium' | 'high';
  relatedVulnerabilities: ChatRelatedVulnerability[];
  relatedMitigations: ChatRelatedMitigation[];
  suggestions?: string[];
};
