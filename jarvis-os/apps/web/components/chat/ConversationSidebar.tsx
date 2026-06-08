"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Search, Trash2 } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils";

export function ConversationSidebar() {
  const [search, setSearch] = useState("");
  const { data, mutate } = useSWR("/chat/conversations", apiClient.get);

  const conversations = (data?.items || []).filter((c: { title: string }) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/chat/conversations/${id}`);
    mutate();
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-white text-sm">Conversations</h2>
          <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv: {
            id: string;
            title: string;
            updatedAt: string;
            mode: string;
          }, i: number) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{conv.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.updatedAt))}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
