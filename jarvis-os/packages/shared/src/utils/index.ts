import { ApiResponse, ApiError, ApiMeta } from "../types/api";

export function createSuccessResponse<T>(
  data: T,
  meta?: ApiMeta
): ApiResponse<T> {
  return { success: true, data, meta };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse {
  const error: ApiError = { code, message, details };
  return { success: false, error };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${id}` : id;
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        return resolve(result);
      } catch (error) {
        if (attempt === maxRetries) return reject(error);
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  });
}

export function parseEnvBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export function sanitizeForLog(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "apikey",
    "authorization",
    "cookie",
  ];
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        return [k, "[REDACTED]"];
      }
      return [k, v];
    })
  );
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}

export function extractJsonFromText(text: string): unknown {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/\{[\s\S]*\}/) ||
    text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}
