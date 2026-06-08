"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Search,
  Code,
  CheckSquare,
  Zap,
  Brain,
} from "lucide-react";

const ACTIONS = [
  {
    label: "New Chat",
    description: "Start a conversation",
    icon: MessageSquare,
    href: "/chat",
    color: "hover:border-blue-500/40",
  },
  {
    label: "Research",
    description: "Search the web",
    icon: Search,
    href: "/chat?agent=research",
    color: "hover:border-cyan-500/40",
  },
  {
    label: "Code Review",
    description: "Analyze your code",
    icon: Code,
    href: "/chat?agent=coding",
    color: "hover:border-green-500/40",
  },
  {
    label: "Add Task",
    description: "Create a new task",
    icon: CheckSquare,
    href: "/tasks?new=true",
    color: "hover:border-purple-500/40",
  },
  {
    label: "Automate",
    description: "Create automation",
    icon: Zap,
    href: "/automations?new=true",
    color: "hover:border-yellow-500/40",
  },
  {
    label: "Recall Memory",
    description: "Search your memories",
    icon: Brain,
    href: "/memory",
    color: "hover:border-pink-500/40",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div>
      <h2 className="font-semibold text-white mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(action.href)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-white/5 transition-all duration-200 text-center ${action.color}`}
          >
            <action.icon className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-white">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
