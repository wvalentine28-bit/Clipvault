"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  CheckSquare,
  FolderOpen,
  Zap,
  Settings,
  BarChart3,
  Cpu,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/useVoice";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { state: voiceState, toggle: toggleVoice } = useVoice();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-card border-r border-border flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-white tracking-wider hud-text">
              JARVIS
            </p>
            <p className="text-xs text-muted-foreground">OS v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Voice Control */}
      <div className="p-4 border-t border-border">
        <button
          onClick={toggleVoice}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            voiceState === "listening"
              ? "bg-green-500/15 text-green-400 border border-green-500/30 voice-pulse"
              : voiceState === "speaking"
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          )}
        >
          <Volume2 className="w-4 h-4" />
          <span>
            {voiceState === "listening"
              ? "Listening..."
              : voiceState === "speaking"
              ? "Speaking..."
              : voiceState === "processing"
              ? "Processing..."
              : "Voice Mode"}
          </span>
          {voiceState !== "idle" && (
            <span className="ml-auto flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="w-0.5 bg-current rounded-full animate-pulse"
                  style={{
                    height: `${8 + i * 4}px`,
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
