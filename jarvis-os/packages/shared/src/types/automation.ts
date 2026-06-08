export type TriggerType =
  | "schedule"
  | "webhook"
  | "voice_command"
  | "event"
  | "condition"
  | "manual";

export type ActionType =
  | "computer_control"
  | "browser_automation"
  | "api_call"
  | "file_operation"
  | "notification"
  | "smart_home"
  | "code_execution"
  | "ai_agent";

export interface Automation {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  lastRunAt?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "regex";
  value: unknown;
  logicalOperator?: "AND" | "OR";
}

export interface AutomationAction {
  id: string;
  order: number;
  type: ActionType;
  name: string;
  config: Record<string, unknown>;
  retryOnFailure: boolean;
  maxRetries: number;
  timeoutMs: number;
  continueOnError: boolean;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  status: "running" | "success" | "failed" | "cancelled";
  trigger: string;
  steps: AutomationRunStep[];
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface AutomationRunStep {
  actionId: string;
  actionName: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface ComputerAction {
  type:
    | "click"
    | "type"
    | "key"
    | "scroll"
    | "screenshot"
    | "open_app"
    | "close_app"
    | "move_file"
    | "create_file"
    | "run_command";
  params: Record<string, unknown>;
}

export interface BrowserAction {
  type:
    | "navigate"
    | "click"
    | "type"
    | "screenshot"
    | "extract"
    | "wait"
    | "scroll"
    | "submit";
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}
