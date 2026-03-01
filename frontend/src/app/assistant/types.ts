export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  suggestions?: string[];
};

export type SSEDeltaData = { text: string };

export type StreamCallbacks = {
  onDelta?: (data: SSEDeltaData) => void;
};
