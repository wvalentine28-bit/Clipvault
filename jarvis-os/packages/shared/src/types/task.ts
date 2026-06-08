export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  subtasks: SubTask[];
  assignedAgentId?: string;
  isRecurring: boolean;
  recurringPattern?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isComplete: boolean;
  completedAt?: Date;
}

export interface Reminder {
  id: string;
  userId: string;
  taskId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  repeatInterval?: string;
  isComplete: boolean;
  notificationSent: boolean;
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  location?: string;
  attendees: string[];
  source: "google" | "outlook" | "local";
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}
