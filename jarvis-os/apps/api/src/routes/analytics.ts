import { Router, Request, Response } from "express";
import { prisma } from "@jarvis/database";
import { createSuccessResponse } from "@jarvis/shared";

const router = Router();

router.get("/overview", async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      totalMessages,
      totalTasks,
      completedTasks,
      totalMemories,
      totalAgentRuns,
      recentActivity,
    ] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.message.count({
        where: { conversation: { userId } },
      }),
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: "DONE" } }),
      prisma.memory.count({ where: { userId } }),
      prisma.agentRun.count({ where: { userId } }),
      prisma.conversation.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build daily activity chart data
    const activityByDay: Record<string, number> = {};
    recentActivity.forEach((c) => {
      const day = c.createdAt.toISOString().split("T")[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    res.json(
      createSuccessResponse({
        stats: {
          totalConversations,
          totalMessages,
          totalTasks,
          completedTasks,
          taskCompletionRate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
          totalMemories,
          totalAgentRuns,
        },
        activityByDay,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get("/usage", async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [messagesByModel, agentRunsByType] = await Promise.all([
      prisma.message.groupBy({
        by: ["model"],
        where: {
          conversation: { userId },
          createdAt: { gte: sevenDaysAgo },
          model: { not: null },
          role: "ASSISTANT",
        },
        _count: true,
        _sum: { outputTokens: true, inputTokens: true },
      }),
      prisma.agentRun.groupBy({
        by: ["agentId"],
        where: { userId, startedAt: { gte: sevenDaysAgo } },
        _count: true,
      }),
    ]);

    res.json(
      createSuccessResponse({
        messagesByModel: messagesByModel.map((m) => ({
          model: m.model,
          count: m._count,
          totalTokens:
            (m._sum.inputTokens || 0) + (m._sum.outputTokens || 0),
        })),
        agentRunsByType,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
