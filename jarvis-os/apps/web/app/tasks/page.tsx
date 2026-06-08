"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Filter, Calendar, Flag, Trash2, Edit, Clock } from "lucide-react";
import useSWR from "swr";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  { key: "TODO", label: "To Do", color: "border-blue-500/30" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-yellow-500/30" },
  { key: "BLOCKED", label: "Blocked", color: "border-red-500/30" },
  { key: "DONE", label: "Done", color: "border-green-500/30" },
];

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-green-400",
};

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  tags: string[];
}

export default function TasksPage() {
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "MEDIUM", status: "TODO" });

  const { data, mutate } = useSWR("/tasks?pageSize=100", apiClient.get);
  const tasks: Task[] = data?.items || data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    await apiClient.post("/tasks", newTask);
    mutate();
    setNewTask({ title: "", priority: "MEDIUM", status: "TODO" });
    setShowNew(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await apiClient.patch(`/tasks/${id}`, { status: status.toLowerCase() });
    mutate();
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/tasks/${id}`);
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-green-400" />
          Tasks
        </h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* New task form */}
      <AnimatePresence>
        {showNew && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="jarvis-border rounded-xl p-4 border border-blue-500/30 space-y-3"
          >
            <input
              autoFocus
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title..."
              className="w-full bg-transparent text-white placeholder:text-muted-foreground focus:outline-none text-lg font-medium"
            />
            <div className="flex items-center gap-3">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);

          return (
            <div key={col.key}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">{col.label}</h3>
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-white/5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {colTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    className={`group bg-card border rounded-xl p-3 cursor-pointer hover:border-white/20 transition-colors ${col.color}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm text-white flex-1",
                        task.status === "DONE" && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Flag className={`w-3 h-3 ${PRIORITY_COLORS[task.priority] || "text-muted-foreground"}`} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {task.priority.toLowerCase()}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Status actions */}
                    {task.status !== "DONE" && (
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.status !== "IN_PROGRESS" && (
                          <button
                            onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                            className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded transition-colors"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(task.id, "DONE")}
                          className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded transition-colors"
                        >
                          Done ✓
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}

                {colTasks.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
