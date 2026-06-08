"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Volume2, Bot, Shield, Key, Bell, Palette, Save } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "voice", label: "Voice", icon: Volume2 },
  { id: "ai", label: "AI Models", icon: Bot },
  { id: "security", label: "Security", icon: Shield },
  { id: "api-keys", label: "API Keys", icon: Key },
];

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Recommended)" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (Most Capable)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Fastest)" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  const { data: prefs, mutate } = useSWR("/settings/preferences", apiClient.get);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const merged = { ...prefs, ...formData };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch("/settings/preferences", formData);
      await mutate();
      setFormData({});
      toast({ type: "success", title: "Settings saved" });
    } catch {
      toast({ type: "error", title: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Settings
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <nav className="w-48 space-y-1 flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="jarvis-border rounded-xl p-6 border border-border space-y-6"
          >
            {activeTab === "general" && (
              <>
                <h2 className="font-semibold text-white">General Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Theme</label>
                    <select
                      value={(merged.theme as string) || "dark"}
                      onChange={(e) => update("theme", e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Language</label>
                    <select
                      value={(merged.language as string) || "en"}
                      onChange={(e) => update("language", e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Response Style</label>
                    <select
                      value={(merged.responseStyle as string) || "conversational"}
                      onChange={(e) => update("responseStyle", e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="concise">Concise — Brief, direct answers</option>
                      <option value="conversational">Conversational — Natural, detailed</option>
                      <option value="detailed">Detailed — Comprehensive explanations</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Notifications</p>
                      <p className="text-xs text-muted-foreground">Get notified about reminders and updates</p>
                    </div>
                    <button
                      onClick={() => update("notificationsEnabled", !merged.notificationsEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        merged.notificationsEnabled ? "bg-blue-600" : "bg-white/20"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        merged.notificationsEnabled ? "left-5.5 translate-x-0.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "voice" && (
              <>
                <h2 className="font-semibold text-white">Voice Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Enable Voice</p>
                      <p className="text-xs text-muted-foreground">Allow voice input and output</p>
                    </div>
                    <button
                      onClick={() => update("voiceEnabled", !merged.voiceEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        merged.voiceEnabled ? "bg-blue-600" : "bg-white/20"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        merged.voiceEnabled ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Wake Word</label>
                    <input
                      value={(merged.wakeWord as string) || "jarvis"}
                      onChange={(e) => update("wakeWord", e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Continuous Listening</p>
                      <p className="text-xs text-muted-foreground">Always listen for wake word</p>
                    </div>
                    <button
                      onClick={() => update("continuousListening", !merged.continuousListening)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative",
                        merged.continuousListening ? "bg-blue-600" : "bg-white/20"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        merged.continuousListening ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "ai" && (
              <>
                <h2 className="font-semibold text-white">AI Model Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Default Model</label>
                    <select
                      value={(merged.defaultModel as string) || "claude-sonnet-4-6"}
                      onChange={(e) => update("defaultModel", e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                    >
                      {MODELS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Save button */}
            {Object.keys(formData).length > 0 && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
