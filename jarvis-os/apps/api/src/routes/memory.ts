import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { searchMemories, saveMemory } from "../services/memory";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";

const router = Router();

router.get("/", async (req: Request, res: Response, next) => {
  try {
    const { type, page = "1", pageSize = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where: {
          userId: req.user!.id,
          ...(type && { type: (type as string).toUpperCase() as any }),
        },
        orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
        skip,
        take: parseInt(pageSize as string),
      }),
      prisma.memory.count({
        where: {
          userId: req.user!.id,
          ...(type && { type: (type as string).toUpperCase() as any }),
        },
      }),
    ]);

    res.json(
      createSuccessResponse(memories, {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        total,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get("/search", async (req: Request, res: Response, next) => {
  try {
    const { q, types, limit = "10" } = req.query;
    if (!q) throw new AppError(400, "BAD_REQUEST", "Query required");

    const results = await searchMemories({
      userId: req.user!.id,
      query: q as string,
      types: types ? (types as string).split(",") : undefined,
      limit: parseInt(limit as string),
    });

    res.json(createSuccessResponse(results));
  } catch (err) {
    next(err);
  }
});

const createMemorySchema = z.object({
  type: z.enum([
    "conversation",
    "preference",
    "fact",
    "goal",
    "project",
    "skill",
    "person",
    "event",
  ]),
  content: z.string().min(1).max(10000),
  importance: z.enum(["low", "medium", "high", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/", async (req: Request, res: Response, next) => {
  try {
    const data = createMemorySchema.parse(req.body);
    const memory = await saveMemory({ ...data, userId: req.user!.id });
    res.status(201).json(createSuccessResponse(memory));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: Request, res: Response, next) => {
  try {
    const memory = await prisma.memory.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!memory) throw new AppError(404, "NOT_FOUND", "Memory not found");

    await prisma.memory.delete({ where: { id: req.params.id } });
    res.json(createSuccessResponse({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req: Request, res: Response, next) => {
  try {
    const [total, byType] = await Promise.all([
      prisma.memory.count({ where: { userId: req.user!.id } }),
      prisma.memory.groupBy({
        by: ["type"],
        where: { userId: req.user!.id },
        _count: true,
      }),
    ]);

    res.json(
      createSuccessResponse({
        total,
        byType: byType.reduce(
          (acc, item) => ({ ...acc, [item.type]: item._count }),
          {}
        ),
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
