import {
  createSuccessResponse,
  createErrorResponse,
  truncateText,
  generateId,
  chunkArray,
  cosineSimilarity,
  retryWithBackoff,
} from "@jarvis/shared";

describe("Shared Utils", () => {
  describe("createSuccessResponse", () => {
    it("should create a success response", () => {
      const response = createSuccessResponse({ foo: "bar" });
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ foo: "bar" });
    });

    it("should include meta when provided", () => {
      const response = createSuccessResponse("data", { total: 10 });
      expect(response.meta?.total).toBe(10);
    });
  });

  describe("createErrorResponse", () => {
    it("should create an error response", () => {
      const response = createErrorResponse("NOT_FOUND", "Not found");
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("truncateText", () => {
    it("should not truncate short text", () => {
      expect(truncateText("hello", 10)).toBe("hello");
    });

    it("should truncate long text with ellipsis", () => {
      const result = truncateText("hello world", 8);
      expect(result).toBe("hello...");
      expect(result.length).toBe(8);
    });
  });

  describe("generateId", () => {
    it("should generate a unique id", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should include prefix when provided", () => {
      const id = generateId("user");
      expect(id.startsWith("user_")).toBe(true);
    });
  });

  describe("chunkArray", () => {
    it("should split array into chunks", () => {
      const chunks = chunkArray([1, 2, 3, 4, 5], 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const v = [1, 0, 0];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it("should return 0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first try", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await retryWithBackoff(fn, 3, 10);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("success");
      const result = await retryWithBackoff(fn, 3, 1);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
