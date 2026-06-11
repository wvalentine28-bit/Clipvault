import { IRouter, Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { createSuccessResponse } from "@jarvis/shared";

const router: IRouter = Router();

const preferencesSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  voiceEnabled: z.boolean().optional(),
  voiceId: z.string().optional(),
  wakeWord: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  continuousListening: z.boolean().optional(),
  responseStyle: z.enum(["concise", "detailed", "conversational"]).optional(),
  defaultModel: z.string().optional(),
});

router.get("/preferences", async (req: Request, res: Response, next) => {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: req.user!.id },
    });
    res.json(createSuccessResponse(prefs));
  } catch (err) {
    next(err);
  }
});

router.patch("/preferences", async (req: Request, res: Response, next) => {
  try {
    const data = preferencesSchema.parse(req.body);
    const prefs = await prisma.userPreferences.upsert({
      where: { userId: req.user!.id },
      update: data,
      create: { ...data, userId: req.user!.id },
    });
    res.json(createSuccessResponse(prefs));
  } catch (err) {
    next(err);
  }
});

router.get("/api-keys", async (req: Request, res: Response, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    res.json(createSuccessResponse(keys));
  } catch (err) {
    next(err);
  }
});

router.post("/api-keys", async (req: Request, res: Response, next) => {
  try {
    const { name, permissions, expiresAt } = z.object({
      name: z.string().min(1),
      permissions: z.array(z.string()).default(["read", "write"]),
      expiresAt: z.string().optional(),
    }).parse(req.body);

    const crypto = require("crypto");
    const key = `jrv_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    const keyPrefix = key.slice(0, 8);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user!.id,
        name,
        keyHash,
        keyPrefix,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    // Only return the full key once
    res.status(201).json(
      createSuccessResponse({
        id: apiKey.id,
        name: apiKey.name,
        key,
        keyPrefix,
        permissions,
        createdAt: apiKey.createdAt,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.delete("/api-keys/:id", async (req: Request, res: Response, next) => {
  try {
    await prisma.apiKey.deleteMany({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    res.json(createSuccessResponse({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

export default router;
