"use client";

import { motion } from "framer-motion";
import { MessageSquare, Zap, Brain, CheckSquare, Clock } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { formatDistanceToNow } from "@/lib/utils";

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  chat: { icon: MessageSquare, color: "text-blue-400" },
  agent: { icon: Zap, color: "text-yellow-400" },
  memory: { icon: Brain, color: "text-purple-400" },
  task: { icon: CheckSquare, color: "text-green-400" },
};

export function ActivityFeed() {
  const { data: conversations } = useSWR("/chat/conversations?pageSize=8", apiClient.get);

  const activities = (conversations?.items || []).map((c: {
    id: string;
    title: string;
    createdAt: string;
    mode: string;
  }) => ({
    id: c.id,
    type: c.mode?.toLowerCase() === "agent" ? "agent" : "chat",
    title: c.title,
    time: c.createdAt,
  }));

  return (
    <div className="jarvis-border rounded-xl p-5 border border-border h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Recent Activity</h2>
        <Clock className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation with JARVIS
            </p>
          </div>
        ) : (
          activities.map((activity: {
            id: string;
            type: string;
            title: string;
            time: string;
          }, i: number) => {
            const { icon: Icon, color } =
              ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.chat;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 group cursor-pointer hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className={`mt-0.5 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.time))}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
