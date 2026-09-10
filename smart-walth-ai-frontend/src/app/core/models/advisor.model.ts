export type AdvisorMode = 'chat' | 'agent' | 'knowledge';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}

/** Un message affiché dans le fil de discussion (côté front uniquement). */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  mode: AdvisorMode;
}
