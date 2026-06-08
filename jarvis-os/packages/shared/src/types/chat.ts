export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessageStatus = "pending" | "streaming" | "complete" | "error";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model?: string;
  tokens?: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface Attachment {
  id: string;
  type: "image" | "file" | "audio" | "video";
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  model: string;
  mode: ConversationMode;
  agentId?: string;
  messages: Message[];
  isArchived: boolean;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationMode = "chat" | "voice" | "agent" | "code";

export interface ChatRequest {
  conversationId?: string;
  message: string;
  model?: string;
  mode?: ConversationMode;
  stream?: boolean;
  attachments?: Attachment[];
  agentId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  model: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface StreamChunk {
  type: "delta" | "done" | "error" | "tool_call" | "tool_result";
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
  messageId?: string;
}
