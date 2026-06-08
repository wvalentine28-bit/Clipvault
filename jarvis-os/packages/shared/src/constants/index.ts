export const AGENT_TYPES = {
  RESEARCH: "research",
  CODING: "coding",
  PLANNING: "planning",
  AUTOMATION: "automation",
  MEMORY: "memory",
  COMMUNICATION: "communication",
  ORCHESTRATOR: "orchestrator",
} as const;

export const AI_MODELS = {
  // Anthropic
  CLAUDE_OPUS: "claude-opus-4-8",
  CLAUDE_SONNET: "claude-sonnet-4-6",
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  // OpenAI
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
  GPT_4_TURBO: "gpt-4-turbo",
  O3: "o3",
  O4_MINI: "o4-mini",
  // Whisper
  WHISPER_1: "whisper-1",
} as const;

export const DEFAULT_MODEL = AI_MODELS.CLAUDE_SONNET;

export const MEMORY_TYPES = {
  CONVERSATION: "conversation",
  PREFERENCE: "preference",
  FACT: "fact",
  GOAL: "goal",
  PROJECT: "project",
  SKILL: "skill",
  PERSON: "person",
  EVENT: "event",
} as const;

export const WEBSOCKET_EVENTS = {
  CHAT_MESSAGE: "chat:message",
  CHAT_STREAM: "chat:stream",
  CHAT_DONE: "chat:done",
  CHAT_ERROR: "chat:error",
  AGENT_STATUS: "agent:status",
  AGENT_STEP: "agent:step",
  AGENT_DONE: "agent:done",
  VOICE_STATE: "voice:state",
  VOICE_TRANSCRIPT: "voice:transcript",
  VOICE_RESPONSE: "voice:response",
  AUTOMATION_STATUS: "automation:status",
  MEMORY_UPDATED: "memory:updated",
  NOTIFICATION: "notification",
  SYSTEM_STATUS: "system:status",
  ERROR: "error",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  VOICE_ERROR: "VOICE_ERROR",
  AGENT_ERROR: "AGENT_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export const MAX_MESSAGE_LENGTH = 32000;
export const MAX_MEMORY_RESULTS = 20;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_AGENT_ITERATIONS = 25;
export const AGENT_TIMEOUT_MS = 120000;
export const VOICE_SILENCE_THRESHOLD_MS = 2000;
export const STREAM_HEARTBEAT_MS = 15000;
