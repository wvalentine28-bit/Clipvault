"use client";

import { motion } from "framer-motion";
import { Bot, User, Copy, Check, Volume2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@jarvis/shared";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
          isUser
            ? "bg-blue-600/20 border border-blue-500/40"
            : "bg-card border border-border"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-400" />
        ) : (
          <Bot className="w-4 h-4 text-blue-400" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-blue-600/20 border border-blue-500/30 text-white ml-auto"
              : "bg-card border border-border text-white",
            isStreaming && "message-stream"
          )}
        >
          <MarkdownContent content={message.content} />
        </div>

        {/* Actions */}
        <div
          className={cn(
            "flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>

          {!isUser && (
            <button className="p-1 rounded hover:bg-white/10 transition-colors">
              <Volume2 className="w-3 h-3 text-muted-foreground" />
            </button>
          )}

          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {message.model && !isUser && (
            <span className="text-xs text-muted-foreground hud-text">
              {message.model.split("-").slice(0, 2).join("-")}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  // Basic markdown rendering
  const rendered = content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono border border-white/10"><code class="language-${lang || "text"}">${escapeHtml(code.trimEnd())}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, "</p><p class='mt-2'>")
    .replace(/\n/g, "<br/>");

  return (
    <div
      dangerouslySetInnerHTML={{ __html: rendered }}
      className="prose-sm prose-invert max-w-none"
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
