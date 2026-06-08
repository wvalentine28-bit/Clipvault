import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { config } from "../config";
import { verifyToken } from "../auth/jwt";
import { prisma } from "@jarvis/database";
import { WEBSOCKET_EVENTS } from "@jarvis/shared";
import { logger } from "../index";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userRole: string;
}

export function setupWebSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).userEmail = user.email;
      (socket as AuthenticatedSocket).userRole = user.role;

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId } = authSocket;

    logger.info({ userId }, "WebSocket client connected");

    // Join user's personal room
    socket.join(`user:${userId}`);

    // ─── CHAT EVENTS ─────────────────────────────────────────

    socket.on("chat:send", async (data: {
      conversationId?: string;
      message: string;
      model?: string;
    }) => {
      try {
        const { runOrchestratorStream } = await import("../agents/orchestrator");
        const { prisma } = await import("@jarvis/database");

        // Get or create conversation
        let conversation = data.conversationId
          ? await prisma.conversation.findUnique({
              where: { id: data.conversationId },
              include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
            })
          : null;

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId,
              title: data.message.slice(0, 60),
              model: data.model || "claude-sonnet-4-6",
            },
            include: { messages: true },
          });
        }

        // Save user message
        const userMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "USER",
            content: data.message,
            status: "COMPLETE",
          },
        });

        socket.emit(WEBSOCKET_EVENTS.CHAT_MESSAGE, {
          type: "user",
          message: userMessage,
          conversationId: conversation.id,
        });

        // Create pending assistant message
        const assistantMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: "",
            status: "STREAMING",
            model: data.model || "claude-sonnet-4-6",
          },
        });

        socket.emit(WEBSOCKET_EVENTS.CHAT_STREAM, {
          type: "start",
          messageId: assistantMessage.id,
          conversationId: conversation.id,
        });

        const history = conversation.messages.map((m) => ({
          role: m.role.toLowerCase(),
          content: m.content,
        }));

        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;

        await runOrchestratorStream(userId, data.message, history, {
          model: data.model || "claude-sonnet-4-6",
          onDelta: (delta) => {
            fullContent += delta;
            socket.emit(WEBSOCKET_EVENTS.CHAT_STREAM, {
              type: "delta",
              messageId: assistantMessage.id,
              content: delta,
            });
          },
        });

        // Update message as complete
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullContent,
            status: "COMPLETE",
            inputTokens,
            outputTokens,
          },
        });

        socket.emit(WEBSOCKET_EVENTS.CHAT_DONE, {
          messageId: assistantMessage.id,
          conversationId: conversation.id,
          content: fullContent,
        });
      } catch (err) {
        logger.error({ err, userId }, "Chat error");
        socket.emit(WEBSOCKET_EVENTS.ERROR, {
          message: "Failed to process message",
          error: String(err),
        });
      }
    });

    // ─── VOICE EVENTS ─────────────────────────────────────────

    socket.on("voice:audio", async (audioData: ArrayBuffer) => {
      try {
        const { transcribeAudio } = await import("../services/openai");
        const { synthesizeSpeech } = await import("../services/elevenlabs");

        socket.emit(WEBSOCKET_EVENTS.VOICE_STATE, { state: "processing" });

        const buffer = Buffer.from(audioData);
        const transcript = await transcribeAudio(buffer);

        socket.emit(WEBSOCKET_EVENTS.VOICE_TRANSCRIPT, {
          text: transcript,
          final: true,
        });

        // Process through JARVIS
        const { runOrchestratorStream } = await import("../agents/orchestrator");
        let response = "";

        await runOrchestratorStream(userId, transcript, [], {
          onDelta: (delta) => {
            response += delta;
          },
        });

        // Synthesize speech
        socket.emit(WEBSOCKET_EVENTS.VOICE_STATE, { state: "speaking" });

        const audioBuffer = await synthesizeSpeech(response);
        socket.emit("voice:response", {
          text: response,
          audio: audioBuffer.toString("base64"),
          format: "mp3",
        });

        socket.emit(WEBSOCKET_EVENTS.VOICE_STATE, { state: "idle" });
      } catch (err) {
        logger.error({ err, userId }, "Voice processing error");
        socket.emit(WEBSOCKET_EVENTS.VOICE_STATE, { state: "error" });
      }
    });

    // ─── AGENT EVENTS ─────────────────────────────────────────

    socket.on("agent:run", async (data: {
      agentType: string;
      goal: string;
      model?: string;
    }) => {
      try {
        const { runAgentWithTools } = await import("../agents/orchestrator");

        socket.emit(WEBSOCKET_EVENTS.AGENT_STATUS, {
          agentType: data.agentType,
          status: "running",
        });

        const result = await runAgentWithTools(
          userId,
          data.goal,
          data.agentType as any,
          {
            model: data.model,
            onStep: (step) => {
              socket.emit(WEBSOCKET_EVENTS.AGENT_STEP, step);
            },
          }
        );

        socket.emit(WEBSOCKET_EVENTS.AGENT_STATUS, {
          agentType: data.agentType,
          status: "complete",
          result,
        });
      } catch (err) {
        socket.emit(WEBSOCKET_EVENTS.AGENT_STATUS, {
          agentType: data.agentType,
          status: "error",
          error: String(err),
        });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info({ userId, reason }, "WebSocket client disconnected");
    });
  });

  return io;
}

export function emitToUser(
  io: SocketServer,
  userId: string,
  event: string,
  data: unknown
) {
  io.to(`user:${userId}`).emit(event, data);
}
