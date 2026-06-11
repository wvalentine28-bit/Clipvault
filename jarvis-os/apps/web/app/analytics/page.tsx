"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MessageSquare, Zap, Brain, CheckSquare } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import useSWR from "swr";
import { apiClient, fetcher } from "@/lib/api";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AnalyticsPage() {
  const { data: overview } = useSWR("/analytics/overview", fetcher);
  const { data: usage } = useSWR("/analytics/usage", fetcher);

  const activityData = Object.entries(overview?.activityByDay || {}).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    conversations: count,
  }));

  const modelData = (usage?.messagesByModel || []).map((m: {
    model: string;
    count: number;
    totalTokens: number;
  }) => ({
    name: m.model?.split("-").slice(0, 2).join("-") || "Unknown",
    messages: m.count,
    tokens: m.totalTokens,
  }));

  const stats = overview?.stats || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your JARVIS usage statistics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Conversations", value: stats.totalConversations || 0, icon: MessageSquare, color: "text-blue-400" },
          { label: "Messages Sent", value: stats.totalMessages || 0, icon: TrendingUp, color: "text-green-400" },
          { label: "Tasks Completed", value: stats.completedTasks || 0, icon: CheckSquare, color: "text-purple-400" },
          { label: "Agent Runs", value: stats.totalAgentRuns || 0, icon: Zap, color: "text-yellow-400" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="jarvis-border rounded-xl p-5 border border-border"
          >
            <kpi.icon className={`w-5 h-5 ${kpi.color} mb-3`} />
            <p className="text-2xl font-bold text-white">{kpi.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Activity Chart */}
      <div className="jarvis-border rounded-xl p-5 border border-border">
        <h2 className="font-semibold text-white mb-4">Conversation Activity (30 days)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="conversations"
              stroke="#3b82f6"
              fill="url(#blueGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Model Usage */}
      {modelData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="jarvis-border rounded-xl p-5 border border-border">
            <h2 className="font-semibold text-white mb-4">Messages by Model</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modelData}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="jarvis-border rounded-xl p-5 border border-border">
            <h2 className="font-semibold text-white mb-4">Token Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="tokens"
                  nameKey="name"
                  label={({ name }) => name}
                >
                  {modelData.map((_: unknown, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Task completion rate */}
      <div className="jarvis-border rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Task Completion Rate</h2>
          <span className="text-2xl font-bold text-green-400">
            {stats.taskCompletionRate || 0}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${stats.taskCompletionRate || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{stats.completedTasks || 0} completed</span>
          <span>{stats.totalTasks || 0} total</span>
        </div>
      </div>
    </div>
  );
}
