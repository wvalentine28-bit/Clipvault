"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Globe,
  Code,
  Calendar,
  MousePointer,
  Brain,
  Mail,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store";

const AGENTS = [
  {
    id: "research",
    name: "Research Agent",
    description: "Web search and information gathering",
    icon: Globe,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "coding",
    name: "Coding Agent",
    description: "Code generation and analysis",
    icon: Code,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    id: "planning",
    name: "Planning Agent",
    description: "Tasks, goals, and scheduling",
    icon: Calendar,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    id: "automation",
    name: "Automation Agent",
    description: "Computer and browser control",
    icon: MousePointer,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    id: "memory",
    name: "Memory Agent",
    description: "Long-term memory management",
    icon: Brain,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  {
    id: "communication",
    name: "Comm Agent",
    description: "Email, calendar, messages",
    icon: Mail,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
  },
];

export function AgentStatusGrid() {
  const router = useRouter();
  const { runningAgents } = useAgentStore();

  return (
    <div className="jarvis-border rounded-xl p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Agent System</h2>
        <span className="text-xs text-muted-foreground hud-text">
          {AGENTS.length} AGENTS AVAILABLE
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AGENTS.map((agent, i) => {
          const isRunning = runningAgents.has(agent.id);

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "group relative rounded-lg p-3 border cursor-pointer transition-all duration-200",
                isRunning
                  ? `${agent.bg} ${agent.border} jarvis-glow`
                  : "border-border hover:border-white/20 hover:bg-white/5"
              )}
              onClick={() => router.push(`/chat?agent=${agent.id}`)}
            >
              <div className={cn("p-2 rounded-lg w-fit mb-2", agent.bg)}>
                <agent.icon
                  className={cn(
                    "w-4 h-4",
                    isRunning ? agent.color : "text-muted-foreground group-hover:" + agent.color
                  )}
                />
              </div>

              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {agent.description}
              </p>

              {isRunning && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <Play className="w-4 h-4 text-white" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
