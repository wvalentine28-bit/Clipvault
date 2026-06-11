"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, GitBranch, Tag, MoreHorizontal, CheckSquare } from "lucide-react";
import useSWR from "swr";
import { apiClient, fetcher } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  ACTIVE: "text-green-400 bg-green-500/10 border-green-500/30",
  PAUSED: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  COMPLETE: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  ARCHIVED: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  category?: string;
  tags: string[];
  repository?: string;
  createdAt: string;
  tasks: Array<{ status: string }>;
}

export default function ProjectsPage() {
  const [showNew, setShowNew] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", category: "" });

  const { data, mutate } = useSWR("/projects", fetcher);
  const projects: Project[] = data?.items || data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    await apiClient.post("/projects", { ...newProject, status: "active" });
    mutate();
    setNewProject({ name: "", description: "", category: "" });
    setShowNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-orange-400" />
          Projects
        </h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="jarvis-border rounded-xl p-5 border border-blue-500/30 space-y-4"
          >
            <h3 className="font-medium text-white">New Project</h3>
            <input
              autoFocus
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="Project name..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
            />
            <input
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
            />
            <div className="flex gap-3">
              <input
                value={newProject.category}
                onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                placeholder="Category"
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project, i) => {
          const taskCount = project.tasks?.length || 0;
          const doneCount = project.tasks?.filter((t) => t.status === "DONE").length || 0;
          const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="jarvis-border rounded-xl p-5 border border-border hover:border-orange-500/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "ml-2 px-2 py-0.5 rounded-md text-xs border capitalize flex-shrink-0",
                    STATUS_COLORS[project.status] || STATUS_COLORS.ACTIVE
                  )}
                >
                  {project.status.toLowerCase()}
                </span>
              </div>

              {taskCount > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{doneCount}/{taskCount} tasks</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {project.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {project.category}
                  </span>
                )}
                {project.repository && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    repo
                  </span>
                )}
                {taskCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    {taskCount} tasks
                  </span>
                )}
                <span className="ml-auto">{formatDate(project.createdAt)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {projects.length === 0 && !showNew && (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-white">No projects yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Create a project to organize your tasks and goals
          </p>
        </div>
      )}
    </div>
  );
}
