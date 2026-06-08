import { Application } from "express";
import { authenticate } from "../auth/jwt";
import { notFound } from "../middleware/errorHandler";

import authRouter from "./auth";
import chatRouter from "./chat";
import memoryRouter from "./memory";
import agentRouter from "./agents";
import taskRouter from "./tasks";
import automationRouter from "./automations";
import voiceRouter from "./voice";
import projectRouter from "./projects";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";

export function setupRoutes(app: Application) {
  const API_V1 = "/api/v1";

  // Public routes
  app.use(`${API_V1}/auth`, authRouter);

  // Protected routes
  app.use(`${API_V1}/chat`, authenticate, chatRouter);
  app.use(`${API_V1}/memory`, authenticate, memoryRouter);
  app.use(`${API_V1}/agents`, authenticate, agentRouter);
  app.use(`${API_V1}/tasks`, authenticate, taskRouter);
  app.use(`${API_V1}/automations`, authenticate, automationRouter);
  app.use(`${API_V1}/voice`, authenticate, voiceRouter);
  app.use(`${API_V1}/projects`, authenticate, projectRouter);
  app.use(`${API_V1}/analytics`, authenticate, analyticsRouter);
  app.use(`${API_V1}/settings`, authenticate, settingsRouter);

  // 404 handler
  app.use(notFound);
}
