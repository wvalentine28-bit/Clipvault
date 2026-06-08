"use client";

import { useState } from "react";
import { Bot, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const AGENTS = [
  { id: null, label: "JARVIS", description: "Full orchestrator" },
  { id: "research", label: "Research", description: "Web search" },
  { id: "coding", label: "Coding", description: "Code generation" },
  { id: "planning", label: "Planning", description: "Tasks & goals" },
  { id: "automation", label: "Automation", description: "Computer control" },
];

interface Props {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function AgentSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const current = AGENTS.find((a) => a.id === selected) || AGENTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm hover:border-blue-500/40 transition-colors"
      >
        <Bot className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-white">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 p-1"
          >
            {AGENTS.map((agent) => (
              <button
                key={String(agent.id)}
                onClick={() => { onSelect(agent.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <Bot className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{agent.label}</p>
                  <p className="text-xs text-muted-foreground">{agent.description}</p>
                </div>
                {selected === agent.id && (
                  <Check className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
