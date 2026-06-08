import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface JarvisStore {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Voice
  voiceState: "idle" | "listening" | "processing" | "speaking" | "error";
  setVoiceState: (state: JarvisStore["voiceState"]) => void;

  // UI
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // System
  systemStatus: Record<string, { status: string; latencyMs?: number }>;
  setSystemStatus: (status: JarvisStore["systemStatus"]) => void;
}

export const useJarvisStore = create<JarvisStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      wsConnected: false,
      setWsConnected: (wsConnected) => set({ wsConnected }),

      voiceState: "idle",
      setVoiceState: (voiceState) => set({ voiceState }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      systemStatus: {},
      setSystemStatus: (systemStatus) => set({ systemStatus }),
    }),
    {
      name: "jarvis-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

interface AgentStore {
  runningAgents: Set<string>;
  addRunningAgent: (id: string) => void;
  removeRunningAgent: (id: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  runningAgents: new Set(),
  addRunningAgent: (id) =>
    set((state) => ({
      runningAgents: new Set([...state.runningAgents, id]),
    })),
  removeRunningAgent: (id) =>
    set((state) => {
      const next = new Set(state.runningAgents);
      next.delete(id);
      return { runningAgents: next };
    }),
}));
