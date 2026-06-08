import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@jarvis/database";
import { signToken, authenticate } from "../auth/jwt";
import { AppError } from "../middleware/errorHandler";
import { strictRateLimiter } from "../middleware/rateLimiter";
import { createSuccessResponse } from "@jarvis/shared";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", strictRateLimiter, async (req, res, next) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "CONFLICT", "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        preferences: { create: {} },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    });

    res
      .status(201)
      .json(createSuccessResponse({ user, token }));
  } catch (err) {
    next(err);
  }
});

router.post("/login", strictRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { preferences: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
    }

    if (!user.isActive) {
      throw new AppError(401, "UNAUTHORIZED", "Account is disabled");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    });

    res.json(
      createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
        },
        token,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { preferences: true },
      omit: { passwordHash: true },
    });

    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    res.json(createSuccessResponse(user));
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticate, async (req, res) => {
  res.json(createSuccessResponse({ message: "Logged out successfully" }));
});

router.post("/refresh", strictRateLimiter, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError(400, "BAD_REQUEST", "Token required");

    const { verifyToken } = await import("../auth/jwt");
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new AppError(401, "UNAUTHORIZED", "User not found");
    }

    const newToken = signToken({
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    });

    res.json(createSuccessResponse({ token: newToken }));
  } catch (err) {
    next(err);
  }
});

export default router;
