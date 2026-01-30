import { ChatAssistantReply } from './types';
import { mockKbAnswer } from './mockKbAnswer';

export async function sendChatMessage(
  input: string
): Promise<ChatAssistantReply> {
  return mockKbAnswer(input);
}
