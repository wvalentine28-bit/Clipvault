import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { prisma } from "@jarvis/database";
import { AppError } from "../middleware/errorHandler";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function signToken(
  payload: { sub: string; email: string; role: string },
  expiresIn = config.JWT_EXPIRES_IN
): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"] as string;

    // API Key auth
    if (apiKey) {
      const keyHash = hashApiKey(apiKey);
      const record = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (!record || !record.user.isActive) {
        throw new AppError(401, "UNAUTHORIZED", "Invalid API key");
      }

      if (record.expiresAt && record.expiresAt < new Date()) {
        throw new AppError(401, "UNAUTHORIZED", "API key expired");
      }

      await prisma.apiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      });

      req.user = {
        id: record.user.id,
        email: record.user.email,
        role: record.user.role.toLowerCase(),
      };
      return next();
    }

    // JWT Bearer auth
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "No authentication token provided");
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, "UNAUTHORIZED", "User not found or inactive");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    };

    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, "TOKEN_EXPIRED", "Token has expired"));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, "INVALID_TOKEN", "Invalid token"));
    }
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          `Required role: ${roles.join(" or ")}`
        )
      );
    }
    next();
  };
}

export function hashApiKey(key: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest("hex");
}
