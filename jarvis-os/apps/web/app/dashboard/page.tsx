"use client";

import { motion } from "framer-motion";
import { AgentStatusGrid } from "@/components/dashboard/AgentStatusGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SystemStatus } from "@/components/dashboard/SystemStatus";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white">
          Good morning,{" "}
          <span className="text-blue-400">Tony</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          JARVIS systems fully operational. How can I assist you today?
        </p>
      </motion.div>

      {/* System Status Bar */}
      <SystemStatus />

      {/* Quick Stats */}
      <QuickStats />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status — takes 2 columns */}
        <div className="lg:col-span-2">
          <AgentStatusGrid />
        </div>

        {/* Activity Feed */}
        <div>
          <ActivityFeed />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
