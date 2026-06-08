"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cpu, Zap, Brain, Shield } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background grid-bg flex flex-col items-center justify-center overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-4xl mx-auto px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center jarvis-glow">
              <Cpu className="w-12 h-12 text-blue-400" />
            </div>
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/10" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-7xl font-bold tracking-tighter mb-4"
        >
          <span className="text-white">JARVIS</span>
          <span className="text-blue-400"> OS</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-muted-foreground mb-2 hud-text"
        >
          Just A Rather Very Intelligent System
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-12 max-w-xl mx-auto"
        >
          The closest real-world equivalent to Tony Stark's AI assistant.
          Voice control, multi-agent orchestration, long-term memory, and
          full computer automation.
        </motion.p>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Brain, label: "Long-Term Memory", color: "text-purple-400" },
            { icon: Zap, label: "Multi-Agent AI", color: "text-yellow-400" },
            { icon: Cpu, label: "Computer Control", color: "text-blue-400" },
            { icon: Shield, label: "Fully Private", color: "text-green-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="jarvis-border rounded-lg p-4 text-center"
            >
              <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all duration-200 jarvis-glow"
          >
            Launch Dashboard
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-8 py-3 border border-blue-500/40 hover:border-blue-500 text-blue-400 rounded-lg font-medium transition-all duration-200"
          >
            Sign In
          </button>
        </motion.div>
      </motion.div>

      {/* Bottom status bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-0 right-0 flex justify-center"
      >
        <div className="flex items-center gap-6 text-xs text-muted-foreground hud-text">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            SYSTEMS ONLINE
          </span>
          <span>VERSION 1.0.0</span>
          <span>JARVIS OS</span>
        </div>
      </motion.div>
    </div>
  );
}
