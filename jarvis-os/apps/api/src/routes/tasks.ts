import { IRouter, Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";

const router: IRouter = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  subtasks: z.array(z.object({ title: z.string() })).optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.string().optional(),
  estimatedMinutes: z.number().optional(),
});

router.get("/", async (req: Request, res: Response, next) => {
  try {
    const { status, priority, projectId, page = "1", pageSize = "50" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (status) where.status = (status as string).toUpperCase();
    if (priority) where.priority = (priority as string).toUpperCase();
    if (projectId) where.projectId = projectId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: parseInt(pageSize as string),
        include: { subtasks: true },
      }),
      prisma.task.count({ where }),
    ]);

    res.json(createSuccessResponse(tasks, { total, page: parseInt(page as string) }));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const { subtasks, ...taskData } = data;

    const task = await prisma.task.create({
      data: {
        ...taskData,
        userId: req.user!.id,
        status: (taskData.status?.toUpperCase() || "TODO") as any,
        priority: (taskData.priority?.toUpperCase() || "MEDIUM") as any,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
        subtasks: subtasks
          ? { create: subtasks.map((s) => ({ title: s.title })) }
          : undefined,
      },
      include: { subtasks: true },
    });

    res.status(201).json(createSuccessResponse(task));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: Request, res: Response, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");

    const { subtasks, ...updates } = createTaskSchema.partial().parse(req.body);

    const task = await prisma.task.update({
      where: { id: req.params.id as string },
      data: {
        ...updates,
        status: updates.status ? (updates.status.toUpperCase() as any) : undefined,
        priority: updates.priority ? (updates.priority.toUpperCase() as any) : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
        completedAt:
          updates.status === "done" ? new Date() : undefined,
      },
      include: { subtasks: true },
    });

    res.json(createSuccessResponse(task));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: Request, res: Response, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Task not found");

    await prisma.task.delete({ where: { id: req.params.id as string } });
    res.json(createSuccessResponse({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req: Request, res: Response, next) => {
  try {
    const [byStatus, byPriority, overdue] = await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { userId: req.user!.id },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { userId: req.user!.id },
        _count: true,
      }),
      prisma.task.count({
        where: {
          userId: req.user!.id,
          dueDate: { lt: new Date() },
          status: { notIn: ["DONE", "CANCELLED"] },
        },
      }),
    ]);

    res.json(
      createSuccessResponse({
        byStatus: byStatus.reduce((a, i) => ({ ...a, [i.status]: i._count }), {}),
        byPriority: byPriority.reduce(
          (a, i) => ({ ...a, [i.priority]: i._count }),
          {}
        ),
        overdue,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
