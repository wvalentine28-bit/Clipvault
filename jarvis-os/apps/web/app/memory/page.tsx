"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Search, Plus, Tag, Trash2, Layers } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const MEMORY_TYPES = [
  "all", "conversation", "preference", "fact", "goal", "project", "skill", "person", "event",
];

const TYPE_COLORS: Record<string, string> = {
  conversation: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  preference: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fact: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  goal: "bg-green-500/20 text-green-400 border-green-500/30",
  project: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  skill: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  person: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  event: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MemoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<unknown[]>([]);

  const { data, mutate } = useSWR(
    `/memory?${typeFilter !== "all" ? `type=${typeFilter}` : ""}`,
    apiClient.get
  );

  const memories = searchResults.length > 0 ? searchResults : (data?.items || data || []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await apiClient.get<unknown[]>(
        `/memory/search?q=${encodeURIComponent(search)}`
      );
      setSearchResults(Array.isArray(results) ? results : []);
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/memory/${id}`);
    mutate();
    setSearchResults((prev) =>
      (prev as Array<{ id: string }>).filter((m) => m.id !== id)
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            Long-Term Memory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total || 0} memories stored
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) setSearchResults([]);
            }}
            placeholder="Search memories with AI..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {MEMORY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${
              typeFilter === type
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                : "text-muted-foreground border border-border hover:text-white hover:bg-white/5"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Memory grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(memories as Array<{
          id: string;
          type: string;
          content: string;
          importance: string;
          tags: string[];
          createdAt: string;
          score?: number;
        }>).map((memory, i) => (
          <motion.div
            key={memory.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="jarvis-border rounded-xl p-4 border border-border group hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span
                className={`px-2 py-0.5 rounded-md text-xs border capitalize ${
                  TYPE_COLORS[memory.type.toLowerCase()] ||
                  "bg-gray-500/20 text-gray-400 border-gray-500/30"
                }`}
              >
                {memory.type.toLowerCase()}
              </span>
              <div className="flex items-center gap-2">
                {memory.score && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(memory.score * 100)}% match
                  </span>
                )}
                <button
                  onClick={() => handleDelete(memory.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>

            <p className="text-sm text-white leading-relaxed line-clamp-3">
              {memory.content}
            </p>

            {memory.tags?.length > 0 && (
              <div className="flex gap-1 mt-3 flex-wrap">
                {memory.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-xs text-muted-foreground"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              {formatDate(memory.createdAt)}
            </p>
          </motion.div>
        ))}
      </div>

      {memories.length === 0 && (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-white">No memories yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Start chatting with JARVIS to build your memory
          </p>
        </div>
      )}
    </div>
  );
}
