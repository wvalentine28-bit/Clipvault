import request from "supertest";
import express from "express";
import { signToken, verifyToken } from "../auth/jwt";

describe("JWT Authentication", () => {
  const payload = { sub: "user-123", email: "test@test.com", role: "user" };

  it("should sign and verify a token", () => {
    process.env.JWT_SECRET = "test-secret-must-be-at-least-32-chars!!";
    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it("should reject an invalid token", () => {
    process.env.JWT_SECRET = "test-secret-must-be-at-least-32-chars!!";
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });
});
