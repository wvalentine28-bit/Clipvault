import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";

const router = Router();

const automationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
  trigger: z.object({
    type: z.enum(["schedule", "webhook", "voice_command", "event", "condition", "manual"]),
    config: z.record(z.unknown()),
  }),
  conditions: z.array(z.object({
    id: z.string().optional(),
    field: z.string(),
    operator: z.enum(["eq", "neq", "gt", "lt", "contains", "regex"]),
    value: z.unknown(),
    logicalOperator: z.enum(["AND", "OR"]).optional(),
  })).default([]),
  actions: z.array(z.object({
    id: z.string().optional(),
    order: z.number(),
    type: z.enum([
      "computer_control",
      "browser_automation",
      "api_call",
      "file_operation",
      "notification",
      "smart_home",
      "code_execution",
      "ai_agent",
    ]),
    name: z.string(),
    config: z.record(z.unknown()),
    retryOnFailure: z.boolean().default(false),
    maxRetries: z.number().default(3),
    timeoutMs: z.number().default(30000),
    continueOnError: z.boolean().default(false),
  })),
});

router.get("/", async (req: Request, res: Response, next) => {
  try {
    const automations = await prisma.automation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });
    res.json(createSuccessResponse(automations));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next) => {
  try {
    const data = automationSchema.parse(req.body);
    const automation = await prisma.automation.create({
      data: {
        ...data,
        userId: req.user!.id,
        trigger: data.trigger as any,
        conditions: data.conditions as any,
        actions: data.actions as any,
      },
    });
    res.status(201).json(createSuccessResponse(automation));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: Request, res: Response, next) => {
  try {
    const existing = await prisma.automation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Automation not found");

    const data = automationSchema.partial().parse(req.body);
    const automation = await prisma.automation.update({
      where: { id: req.params.id },
      data: {
        ...data,
        trigger: data.trigger as any,
        conditions: data.conditions as any,
        actions: data.actions as any,
      },
    });
    res.json(createSuccessResponse(automation));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/run", async (req: Request, res: Response, next) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!automation) throw new AppError(404, "NOT_FOUND", "Automation not found");

    const run = await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        status: "RUNNING",
        trigger: "manual",
        startedAt: new Date(),
      },
    });

    // Execute actions asynchronously
    executeAutomation(automation, run.id).catch(async (err) => {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: String(err),
          completedAt: new Date(),
        },
      });
    });

    res.json(createSuccessResponse({ runId: run.id, status: "running" }));
  } catch (err) {
    next(err);
  }
});

async function executeAutomation(
  automation: { id: string; actions: unknown },
  runId: string
) {
  const actions = automation.actions as Array<{
    order: number;
    name: string;
    type: string;
    config: Record<string, unknown>;
    continueOnError: boolean;
    timeoutMs: number;
  }>;

  const steps: Array<{
    actionName: string;
    status: string;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
  }> = [];

  const sortedActions = [...actions].sort((a, b) => a.order - b.order);

  for (const action of sortedActions) {
    const step = {
      actionName: action.name,
      status: "running",
      startedAt: new Date(),
    };

    try {
      await executeAction(action);
      steps.push({ ...step, status: "success", completedAt: new Date() });
    } catch (err) {
      steps.push({
        ...step,
        status: "failed",
        completedAt: new Date(),
        error: String(err),
      });
      if (!action.continueOnError) throw err;
    }
  }

  await prisma.automationRun.update({
    where: { id: runId },
    data: {
      status: "SUCCESS",
      steps: steps as any,
      completedAt: new Date(),
    },
  });

  await prisma.automation.update({
    where: { id: automation.id },
    data: {
      lastRunAt: new Date(),
      runCount: { increment: 1 },
      successCount: { increment: 1 },
    },
  });
}

async function executeAction(action: {
  type: string;
  config: Record<string, unknown>;
  timeoutMs: number;
}) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Action timeout")), action.timeoutMs)
  );

  const execution = async () => {
    switch (action.type) {
      case "notification":
        console.log(`[Automation] Notification: ${action.config.message}`);
        break;
      case "api_call":
        if (action.config.url) {
          await fetch(action.config.url as string, {
            method: (action.config.method as string) || "GET",
            headers: (action.config.headers as Record<string, string>) || {},
            body: action.config.body
              ? JSON.stringify(action.config.body)
              : undefined,
          });
        }
        break;
      case "ai_agent":
        const { runAgentWithTools } = await import("../agents/orchestrator");
        await runAgentWithTools(
          action.config.userId as string,
          action.config.goal as string,
          (action.config.agentType as any) || "planning"
        );
        break;
      default:
        console.log(`[Automation] Executing action type: ${action.type}`);
    }
  };

  await Promise.race([execution(), timeout]);
}

export default router;
