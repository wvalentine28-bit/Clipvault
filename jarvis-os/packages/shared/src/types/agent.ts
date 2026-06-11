export type AgentType =
  | "research"
  | "coding"
  | "planning"
  | "automation"
  | "memory"
  | "communication"
  | "orchestrator";

export type AgentStatus = "idle" | "running" | "paused" | "error" | "complete";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: AgentStatus;
  capabilities: string[];
  tools: string[];
  model: string;
  systemPrompt: string;
  maxIterations: number;
  timeout: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRun {
  id: string;
  agentId: string;
  userId: string;
  conversationId?: string;
  status: AgentStatus;
  input: string;
  output?: string;
  steps: AgentStep[];
  tokensUsed: number;
  durationMs: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface AgentStep {
  id: string;
  runId: string;
  stepNumber: number;
  type: "thought" | "action" | "observation" | "final";
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  timestamp: Date;
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentState {
  messages: Array<{ role: string; content: string }>;
  currentStep: number;
  maxSteps: number;
  tools: string[];
  context: Record<string, unknown>;
  memoryContext?: string;
  planningContext?: string;
}

export interface MultiAgentTask {
  id: string;
  orchestratorId: string;
  goal: string;
  subTasks: AgentSubTask[];
  status: AgentStatus;
  result?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentSubTask {
  id: string;
  parentTaskId: string;
  agentType: AgentType;
  instruction: string;
  dependencies: string[];
  status: AgentStatus;
  result?: string;
  assignedAgentId?: string;
}
