export type UserRole = "admin" | "user" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  voiceEnabled: boolean;
  voiceId: string;
  wakeWord: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  continuousListening: boolean;
  responseStyle: "concise" | "detailed" | "conversational";
  defaultModel: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}
