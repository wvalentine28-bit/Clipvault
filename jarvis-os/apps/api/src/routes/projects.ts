import { IRouter, Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";

const router: IRouter = Router();

const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["planning", "active", "paused", "complete", "archived"]).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  repository: z.string().optional(),
  notes: z.string().optional(),
});

router.get("/", async (req: Request, res: Response, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: {
          select: { id: true, status: true, priority: true },
        },
      },
    });
    res.json(createSuccessResponse(projects));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next) => {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        ...data,
        userId: req.user!.id,
        status: (data.status?.toUpperCase() || "ACTIVE") as any,
      },
    });
    res.status(201).json(createSuccessResponse(project));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
      include: { tasks: { include: { subtasks: true }, orderBy: { priority: "desc" } } },
    });
    if (!project) throw new AppError(404, "NOT_FOUND", "Project not found");
    res.json(createSuccessResponse(project));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: Request, res: Response, next) => {
  try {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Project not found");

    const data = projectSchema.partial().parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data: {
        ...data,
        status: data.status ? (data.status.toUpperCase() as any) : undefined,
      },
    });
    res.json(createSuccessResponse(project));
  } catch (err) {
    next(err);
  }
});

export default router;
