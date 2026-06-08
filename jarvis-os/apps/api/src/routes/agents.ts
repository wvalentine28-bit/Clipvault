import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { runAgentWithTools } from "../agents/orchestrator";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";
import { chatRateLimiter } from "../middleware/rateLimiter";

const router = Router();

const AGENT_DEFINITIONS = [
  {
    id: "research",
    name: "Research Agent",
    type: "research",
    description: "Searches the web, gathers information, and builds reports",
    capabilities: ["web_search", "summarize", "fact_check", "report_generation"],
    tools: ["web_search", "search_memory", "save_memory"],
    model: "claude-sonnet-4-6",
  },
  {
    id: "coding",
    name: "Coding Agent",
    type: "coding",
    description: "Generates, analyzes, and debugs code across all languages",
    capabilities: ["code_generation", "debugging", "code_review", "git_operations"],
    tools: ["analyze_code", "web_search", "search_memory"],
    model: "claude-sonnet-4-6",
  },
  {
    id: "planning",
    name: "Planning Agent",
    type: "planning",
    description: "Creates detailed plans, schedules, and tracks goals",
    capabilities: ["task_planning", "scheduling", "goal_tracking", "prioritization"],
    tools: ["create_task", "get_tasks", "search_memory", "save_memory"],
    model: "claude-sonnet-4-6",
  },
  {
    id: "automation",
    name: "Automation Agent",
    type: "automation",
    description: "Automates computer tasks, browser operations, and file management",
    capabilities: ["browser_automation", "file_operations", "system_control"],
    tools: ["web_search"],
    model: "claude-sonnet-4-6",
  },
  {
    id: "memory",
    name: "Memory Agent",
    type: "memory",
    description: "Manages long-term memory, preferences, and knowledge",
    capabilities: ["memory_storage", "memory_retrieval", "context_building"],
    tools: ["search_memory", "save_memory"],
    model: "claude-haiku-4-5-20251001",
  },
  {
    id: "communication",
    name: "Communication Agent",
    type: "communication",
    description: "Drafts emails, manages calendar, handles communication",
    capabilities: ["email_drafting", "calendar_management", "meeting_scheduling"],
    tools: ["search_memory", "create_task"],
    model: "claude-sonnet-4-6",
  },
];

router.get("/", async (req: Request, res: Response) => {
  res.json(createSuccessResponse(AGENT_DEFINITIONS));
});

router.get("/:id", async (req: Request, res: Response, next) => {
  const agent = AGENT_DEFINITIONS.find((a) => a.id === req.params.id);
  if (!agent) throw new AppError(404, "NOT_FOUND", "Agent not found");
  res.json(createSuccessResponse(agent));
});

const runAgentSchema = z.object({
  goal: z.string().min(1).max(10000),
  model: z.string().optional(),
  stream: z.boolean().default(false),
});

router.post("/:id/run", chatRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const agent = AGENT_DEFINITIONS.find((a) => a.id === req.params.id);
    if (!agent) throw new AppError(404, "NOT_FOUND", "Agent not found");

    const { goal, model, stream } = runAgentSchema.parse(req.body);
    const userId = req.user!.id;

    const agentRun = await prisma.agentRun.create({
      data: {
        userId,
        agentId: agent.id,
        status: "RUNNING",
        input: goal,
        startedAt: new Date(),
      },
    });

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(
        `data: ${JSON.stringify({ type: "start", runId: agentRun.id })}\n\n`
      );

      let stepNumber = 0;
      let result = "";

      result = await runAgentWithTools(userId, goal, agent.type as any, {
        model: model || agent.model,
        onStep: async (step) => {
          stepNumber++;
          await prisma.agentStep.create({
            data: {
              runId: agentRun.id,
              stepNumber,
              type: step.type.toUpperCase() as any,
              content: step.content,
              toolName: step.toolName,
            },
          });
          res.write(`data: ${JSON.stringify({ type: "step", step })}\n\n`);
        },
      });

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: "COMPLETE",
          output: result,
          completedAt: new Date(),
        },
      });

      res.write(
        `data: ${JSON.stringify({ type: "done", runId: agentRun.id, result })}\n\n`
      );
      res.end();
    } else {
      const result = await runAgentWithTools(userId, goal, agent.type as any, {
        model: model || agent.model,
      });

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: { status: "COMPLETE", output: result, completedAt: new Date() },
      });

      res.json(createSuccessResponse({ runId: agentRun.id, result }));
    }
  } catch (err) {
    next(err);
  }
});

router.get("/runs/history", async (req: Request, res: Response, next) => {
  try {
    const { page = "1", pageSize = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    const [runs, total] = await Promise.all([
      prisma.agentRun.findMany({
        where: { userId: req.user!.id },
        orderBy: { startedAt: "desc" },
        skip,
        take: parseInt(pageSize as string),
        include: { steps: { orderBy: { stepNumber: "asc" } } },
      }),
      prisma.agentRun.count({ where: { userId: req.user!.id } }),
    ]);

    res.json(createSuccessResponse(runs, { total, page: parseInt(page as string) }));
  } catch (err) {
    next(err);
  }
});

export default router;
