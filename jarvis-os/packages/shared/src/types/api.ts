export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  cursor?: string;
  hasMore?: boolean;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  correlationId?: string;
}

export interface WebSocketEvent {
  CHAT_MESSAGE: "chat:message";
  CHAT_STREAM: "chat:stream";
  CHAT_DONE: "chat:done";
  AGENT_STATUS: "agent:status";
  AGENT_STEP: "agent:step";
  VOICE_STATE: "voice:state";
  VOICE_TRANSCRIPT: "voice:transcript";
  AUTOMATION_STATUS: "automation:status";
  MEMORY_UPDATED: "memory:updated";
  NOTIFICATION: "notification";
  ERROR: "error";
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  services: Record<
    string,
    {
      status: "up" | "down" | "degraded";
      latencyMs?: number;
      message?: string;
    }
  >;
}
