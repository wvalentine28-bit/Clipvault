"use client";

import { useState, useCallback } from "react";
import { useJarvisStore } from "@/store";
import type { Message } from "@jarvis/shared";

interface SendOptions {
  model?: string;
  conversationId?: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { token } = useJarvisStore();

  const sendMessage = useCallback(
    async (content: string, options: SendOptions = {}) => {
      const tempId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: tempId,
        conversationId: options.conversationId || conversationId || "",
        role: "user",
        content,
        status: "complete",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantId,
        conversationId: options.conversationId || conversationId || "",
        role: "assistant",
        content: "",
        status: "streaming",
        model: options.model,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token || localStorage.getItem("jarvis-token")}`,
            },
            body: JSON.stringify({
              message: content,
              conversationId: options.conversationId || conversationId,
              model: options.model || "claude-sonnet-4-6",
              stream: true,
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "start") {
                setConversationId(data.conversationId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, id: data.messageId, conversationId: data.conversationId }
                      : m
                  )
                );
              }

              if (data.type === "delta") {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId || m.id === data.messageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }

              if (data.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId || m.id === data.messageId
                      ? { ...m, status: "complete" }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, I encountered an error. Please try again.",
                  status: "error",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [token, conversationId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, isStreaming, conversationId, sendMessage, clearMessages };
}
