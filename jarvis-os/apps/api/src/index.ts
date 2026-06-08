import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "./config";
import { setupRoutes } from "./routes";
import { setupWebSocket } from "./websocket";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { prisma } from "@jarvis/database";
import { redisClient } from "./services/redis";

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  transport:
    config.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  // Core middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })
  );

  app.use(rateLimiter);

  // Health check (before auth)
  app.get("/health", async (req, res) => {
    const services: Record<string, { status: string; latencyMs?: number }> = {};

    // Check database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = { status: "up", latencyMs: Date.now() - dbStart };
    } catch {
      services.database = { status: "down" };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      await redisClient.ping();
      services.redis = { status: "up", latencyMs: Date.now() - redisStart };
    } catch {
      services.redis = { status: "down" };
    }

    const allUp = Object.values(services).every((s) => s.status === "up");

    res.status(allUp ? 200 : 503).json({
      status: allUp ? "healthy" : "degraded",
      version: process.env.npm_package_version || "1.0.0",
      timestamp: new Date().toISOString(),
      services,
    });
  });

  // API routes
  setupRoutes(app);

  // WebSocket
  const io = setupWebSocket(httpServer);
  app.set("io", io);

  // Error handler (must be last)
  app.use(errorHandler);

  const port = parseInt(config.PORT, 10);
  httpServer.listen(port, () => {
    logger.info(`JARVIS API running on http://localhost:${port}`);
    logger.info(`WebSocket ready on ws://localhost:${port}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      redisClient.disconnect();
      logger.info("Server shut down");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return { app, httpServer, io };
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
