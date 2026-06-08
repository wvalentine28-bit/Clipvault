"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Play, Pause, Trash2, Clock, CheckCircle, XCircle, Globe, Mic } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  schedule: Clock,
  voice_command: Mic,
  webhook: Globe,
  manual: Play,
};

interface Automation {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  trigger: { type: string; config: Record<string, unknown> };
  runCount: number;
  successCount: number;
  failureCount: number;
  lastRunAt?: string;
  createdAt: string;
}

export default function AutomationsPage() {
  const { data, mutate } = useSWR("/automations", apiClient.get);
  const automations: Automation[] = data?.items || data || [];

  const handleToggle = async (id: string, isEnabled: boolean) => {
    await apiClient.patch(`/automations/${id}`, { isEnabled: !isEnabled });
    mutate();
  };

  const handleRun = async (id: string) => {
    await apiClient.post(`/automations/${id}/run`, {});
    toast({ type: "success", title: "Automation triggered" });
    mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Automations
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Template suggestions */}
      <div className="jarvis-border rounded-xl p-5 border border-yellow-500/20">
        <h2 className="font-medium text-white mb-3">Quick Templates</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: "Daily Briefing", icon: Clock, desc: "Morning summary at 9am" },
            { name: "Voice Research", icon: Mic, desc: "Research on voice command" },
            { name: "Task Reminders", icon: CheckCircle, desc: "Daily task follow-ups" },
            { name: "Webhook Handler", icon: Globe, desc: "React to external events" },
          ].map(({ name, icon: Icon, desc }) => (
            <button
              key={name}
              className="flex flex-col items-center gap-2 p-3 border border-border rounded-lg hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all text-center"
            >
              <Icon className="w-5 h-5 text-yellow-400" />
              <p className="text-xs font-medium text-white">{name}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Automation list */}
      <div className="space-y-3">
        {automations.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-white">No automations yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Create automations to let JARVIS act on your behalf
            </p>
          </div>
        ) : (
          automations.map((auto, i) => {
            const TriggerIcon = TRIGGER_ICONS[auto.trigger.type] || Zap;
            const successRate =
              auto.runCount > 0
                ? Math.round((auto.successCount / auto.runCount) * 100)
                : 0;

            return (
              <motion.div
                key={auto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "jarvis-border rounded-xl p-4 border transition-colors group",
                  auto.isEnabled ? "border-yellow-500/20" : "border-border opacity-60"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2.5 rounded-lg",
                    auto.isEnabled ? "bg-yellow-500/15" : "bg-white/5"
                  )}>
                    <TriggerIcon className={cn(
                      "w-5 h-5",
                      auto.isEnabled ? "text-yellow-400" : "text-muted-foreground"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{auto.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        auto.isEnabled
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-muted-foreground"
                      )}>
                        {auto.isEnabled ? "Active" : "Paused"}
                      </span>
                    </div>

                    {auto.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{auto.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{auto.trigger.type.replace("_", " ")}</span>
                      <span>{auto.runCount} runs</span>
                      {auto.runCount > 0 && (
                        <span className={successRate > 80 ? "text-green-400" : "text-red-400"}>
                          {successRate}% success
                        </span>
                      )}
                      {auto.lastRunAt && <span>Last: {formatDate(auto.lastRunAt)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRun(auto.id)}
                      className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Run now"
                    >
                      <Play className="w-4 h-4 text-green-400" />
                    </button>
                    <button
                      onClick={() => handleToggle(auto.id, auto.isEnabled)}
                      className="p-1.5 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      title={auto.isEnabled ? "Pause" : "Enable"}
                    >
                      {auto.isEnabled
                        ? <Pause className="w-4 h-4 text-yellow-400" />
                        : <Play className="w-4 h-4 text-yellow-400" />
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
