"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

let toastQueue: ((toast: Omit<Toast, "id">) => void)[] = [];

export function toast(t: Omit<Toast, "id">) {
  toastQueue.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const add = (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 5000);
    };

    toastQueue.push(add);
    return () => {
      toastQueue = toastQueue.filter((fn) => fn !== add);
    };
  }, []);

  const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
  const COLORS = {
    success: "text-green-400 border-green-500/30 bg-green-500/10",
    error: "text-red-400 border-red-500/30 bg-red-500/10",
    info: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${COLORS[t.type]} backdrop-blur-sm`}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
