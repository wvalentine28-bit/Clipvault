export type MemoryType =
  | "conversation"
  | "preference"
  | "fact"
  | "goal"
  | "project"
  | "skill"
  | "person"
  | "event";

export type MemoryImportance = "low" | "medium" | "high" | "critical";

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  summary?: string;
  importance: MemoryImportance;
  embedding?: number[];
  tags: string[];
  source?: string;
  sourceId?: string;
  accessCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  relevanceReason?: string;
}

export interface MemoryQuery {
  query: string;
  userId: string;
  types?: MemoryType[];
  limit?: number;
  threshold?: number;
  includeExpired?: boolean;
}

export interface UserProfile {
  userId: string;
  name: string;
  preferences: Record<string, unknown>;
  goals: Goal[];
  projects: Project[];
  skills: string[];
  relationships: PersonRelationship[];
  dailyRoutines: DailyRoutine[];
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "active" | "completed" | "paused" | "abandoned";
  targetDate?: Date;
  progress: number;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  isComplete: boolean;
  completedAt?: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: "planning" | "active" | "paused" | "complete" | "archived";
  category: string;
  tags: string[];
  repository?: string;
  notes?: string;
  tasks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonRelationship {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  email?: string;
  notes?: string;
  lastInteractionAt?: Date;
  createdAt: Date;
}

export interface DailyRoutine {
  id: string;
  userId: string;
  name: string;
  steps: RoutineStep[];
  schedule: string;
  isActive: boolean;
}

export interface RoutineStep {
  order: number;
  action: string;
  duration?: number;
}
