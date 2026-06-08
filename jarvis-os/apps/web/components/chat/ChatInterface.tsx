"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Mic, Square, Bot, Cpu } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { VoiceButton } from "./VoiceButton";
import { AgentSelector } from "./AgentSelector";
import { ModelSelector } from "./ModelSelector";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import type { Message } from "@jarvis/shared";

export function ChatInterface() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent");

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-6");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agentParam);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, conversationId, sendMessage, clearMessages } =
    useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isStreaming) return;

      const text = input.trim();
      setInput("");

      await sendMessage(text, {
        model: selectedModel,
        conversationId: conversationId ?? undefined,
      });
    },
    [input, isStreaming, sendMessage, selectedModel, conversationId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
    },
    []
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-white">JARVIS</p>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AgentSelector
            selected={selectedAgent}
            onSelect={setSelectedAgent}
          />
          <ModelSelector
            selected={selectedModel}
            onSelect={setSelectedModel}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeScreen onPrompt={(p) => { setInput(p); inputRef.current?.focus(); }} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-3 bg-card border border-border rounded-xl p-3 focus-within:border-blue-500/50 transition-colors"
        >
          <button
            type="button"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 self-end mb-0.5"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message JARVIS..."
            rows={1}
            className="flex-1 bg-transparent text-white placeholder:text-muted-foreground resize-none focus:outline-none min-h-[24px] max-h-40 overflow-y-auto leading-6 text-sm"
            style={{ height: "auto" }}
          />

          <div className="flex items-center gap-2 flex-shrink-0 self-end">
            <VoiceButton onTranscript={handleVoiceTranscript} />

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                input.trim() && !isStreaming
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-white/10 text-muted-foreground cursor-not-allowed"
              )}
            >
              {isStreaming ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-2">
          JARVIS can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen({ onPrompt }: { onPrompt: (p: string) => void }) {
  const suggestions = [
    "What's on my task list today?",
    "Research the latest developments in quantum computing",
    "Help me debug my TypeScript code",
    "Schedule a workout for this week",
    "Write an email to my team about the project update",
    "What do you remember about my current projects?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-96 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-6 jarvis-glow">
        <Bot className="w-8 h-8 text-blue-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        Good day. How may I assist?
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        I have access to the web, your memory, task management, code tools,
        and computer automation. What shall we accomplish?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPrompt(s)}
            className="text-left px-4 py-3 rounded-lg border border-border hover:border-blue-500/40 hover:bg-blue-500/5 text-sm text-muted-foreground hover:text-white transition-all duration-200"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
