"use client";

import { motion } from "framer-motion";
import { MessageSquare, CheckSquare, Brain, Zap, TrendingUp } from "lucide-react";
import useSWR from "swr";
import { apiClient, fetcher } from "@/lib/api";

export function QuickStats() {
  const { data } = useSWR("/analytics/overview", fetcher);

  const stats = [
    {
      label: "Conversations",
      value: data?.stats?.totalConversations || 0,
      icon: MessageSquare,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      trend: "+12%",
    },
    {
      label: "Tasks Complete",
      value: data?.stats?.completedTasks || 0,
      icon: CheckSquare,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      trend: `${data?.stats?.taskCompletionRate || 0}%`,
    },
    {
      label: "Memories Stored",
      value: data?.stats?.totalMemories || 0,
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      trend: "+8%",
    },
    {
      label: "Agent Runs",
      value: data?.stats?.totalAgentRuns || 0,
      icon: Zap,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      trend: "+25%",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`jarvis-border rounded-xl p-4 border ${stat.border}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <span className="flex items-center gap-1 text-xs text-green-400">
              <TrendingUp className="w-3 h-3" />
              {stat.trend}
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stat.value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
