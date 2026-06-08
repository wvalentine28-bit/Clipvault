import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../index";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  // Prisma errors
  if ((err as { code?: string }).code === "P2002") {
    return res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "Resource already exists",
      },
    });
  }

  if ((err as { code?: string }).code === "P2025") {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
      },
    });
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}
