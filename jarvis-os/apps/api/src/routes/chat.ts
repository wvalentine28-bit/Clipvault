import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { runOrchestratorStream } from "../agents/orchestrator";
import { chatRateLimiter } from "../middleware/rateLimiter";
import { AppError } from "../middleware/errorHandler";
import { createSuccessResponse } from "@jarvis/shared";
import { saveMemory } from "../services/memory";

const router = Router();

const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(32000),
  model: z.string().optional(),
  stream: z.boolean().default(true),
});

router.get("/conversations", async (req: Request, res: Response, next) => {
  try {
    const { page = "1", pageSize = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId: req.user!.id, isArchived: false },
        orderBy: { updatedAt: "desc" },
        skip,
        take: parseInt(pageSize as string),
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.conversation.count({
        where: { userId: req.user!.id, isArchived: false },
      }),
    ]);

    res.json(
      createSuccessResponse(conversations, {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get("/conversations/:id", async (req: Request, res: Response, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }

    res.json(createSuccessResponse(conversation));
  } catch (err) {
    next(err);
  }
});

router.post("/send", chatRateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { conversationId, message, model, stream } =
      sendMessageSchema.parse(req.body);
    const userId = req.user!.id;

    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: { orderBy: { createdAt: "asc" }, take: 50 },
          },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: message.slice(0, 60),
          model: model || "claude-sonnet-4-6",
        },
        include: { messages: true },
      });
    }

    const userMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
        status: "COMPLETE",
      },
    });

    const history = conversation.messages.map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const assistantMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: "",
          status: "STREAMING",
          model: model || "claude-sonnet-4-6",
        },
      });

      res.write(
        `data: ${JSON.stringify({
          type: "start",
          conversationId: conversation.id,
          messageId: assistantMsg.id,
        })}\n\n`
      );

      let fullContent = "";

      await runOrchestratorStream(userId, message, history, {
        model: model || "claude-sonnet-4-6",
        onDelta: (delta) => {
          fullContent += delta;
          res.write(
            `data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`
          );
        },
      });

      await prisma.message.update({
        where: { id: assistantMsg.id },
        data: { content: fullContent, status: "COMPLETE" },
      });

      // Save to memory
      await saveMemory({
        userId,
        type: "conversation",
        content: `User: ${message}\nJARVIS: ${fullContent.slice(0, 500)}`,
        importance: "low",
        source: "chat",
        sourceId: conversation.id,
      }).catch(() => {});

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          messageId: assistantMsg.id,
          conversationId: conversation.id,
        })}\n\n`
      );
      res.end();
    } else {
      let fullContent = "";

      await runOrchestratorStream(userId, message, history, {
        model: model || "claude-sonnet-4-6",
        onDelta: (delta) => { fullContent += delta; },
      });

      const assistantMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: fullContent,
          status: "COMPLETE",
          model: model || "claude-sonnet-4-6",
        },
      });

      res.json(
        createSuccessResponse({
          conversationId: conversation.id,
          userMessage: userMsg,
          assistantMessage: assistantMsg,
        })
      );
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/conversations/:id", async (req: Request, res: Response, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!conversation) {
      throw new AppError(404, "NOT_FOUND", "Conversation not found");
    }

    await prisma.conversation.delete({ where: { id: req.params.id } });
    res.json(createSuccessResponse({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

export default router;
