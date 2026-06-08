"use client";

import { useState } from "react";
import { Cpu, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet", provider: "Anthropic" },
  { id: "claude-opus-4-8", label: "Claude Opus", provider: "Anthropic" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku", provider: "Anthropic" },
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
];

interface Props {
  selected: string;
  onSelect: (model: string) => void;
}

export function ModelSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODELS.find((m) => m.id === selected) || MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:border-blue-500/40 transition-colors"
      >
        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-50 p-1"
          >
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => { onSelect(model.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex-1">
                  <p className="text-sm text-white">{model.label}</p>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                </div>
                {selected === model.id && (
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
