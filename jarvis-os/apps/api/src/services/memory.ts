import { prisma } from "@jarvis/database";
import { createEmbedding } from "./openai";
import { cacheClient, cacheKey } from "./redis";
import { logger } from "../index";

const CACHE_TTL = 300; // 5 minutes

export interface MemorySearchOptions {
  userId: string;
  query: string;
  types?: string[];
  limit?: number;
  threshold?: number;
}

export async function searchMemories(options: MemorySearchOptions) {
  const { userId, query, types, limit = 10, threshold = 0.7 } = options;

  const cacheKeyStr = cacheKey("memory:search", userId, query, limit.toString());
  const cached = await cacheClient.get<unknown[]>(cacheKeyStr);
  if (cached) return cached;

  try {
    // Generate embedding for the query
    const queryEmbedding = await createEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Vector similarity search using pgvector
    const typeFilter = types && types.length > 0
      ? `AND type = ANY(ARRAY[${types.map((t) => `'${t}'`).join(",")}]::text[])`
      : "";

    const memories = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      type: string;
      importance: string;
      tags: string[];
      source: string;
      createdAt: Date;
      score: number;
    }>>(
      `SELECT id, content, type, importance, tags, source, "createdAt",
       1 - (embedding <=> '${embeddingStr}'::vector) AS score
       FROM "Memory"
       WHERE "userId" = $1
       AND embedding IS NOT NULL
       ${typeFilter}
       AND (1 - (embedding <=> '${embeddingStr}'::vector)) > $2
       ORDER BY score DESC
       LIMIT $3`,
      userId,
      threshold,
      limit
    );

    await cacheClient.set(cacheKeyStr, memories, CACHE_TTL);
    return memories;
  } catch (err) {
    logger.error({ err }, "Memory vector search failed, falling back to text search");

    // Fallback: text search
    return prisma.memory.findMany({
      where: {
        userId,
        ...(types && { type: { in: types as any[] } }),
        content: { contains: query, mode: "insensitive" },
      },
      orderBy: { importance: "desc" },
      take: limit,
    });
  }
}

export async function saveMemory(data: {
  userId: string;
  type: string;
  content: string;
  importance?: string;
  tags?: string[];
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const embedding = await createEmbedding(data.content);

    const memory = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "Memory" (id, "userId", type, content, importance, tags, source, "sourceId", metadata, embedding, "createdAt", "updatedAt")
       VALUES (uuid_generate_v4(), $1, $2::text::"MemoryType", $3, $4::text::"MemoryImportance", $5, $6, $7, $8, $9::vector, NOW(), NOW())
       RETURNING id`,
      data.userId,
      data.type.toUpperCase(),
      data.content,
      (data.importance || "medium").toUpperCase(),
      data.tags || [],
      data.source || null,
      data.sourceId || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      `[${embedding.join(",")}]`
    );

    await cacheClient.deletePattern(cacheKey("memory:search", data.userId, "*"));
    return memory[0];
  } catch (err) {
    logger.error({ err }, "Failed to save memory with embedding, saving without");
    return prisma.memory.create({
      data: {
        userId: data.userId,
        type: data.type.toUpperCase() as any,
        content: data.content,
        importance: (data.importance || "MEDIUM").toUpperCase() as any,
        tags: data.tags || [],
        source: data.source,
        sourceId: data.sourceId,
        metadata: data.metadata,
      },
    });
  }
}

export async function getUserContext(userId: string): Promise<string> {
  const [preferences, recentMemories, goals] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.memory.findMany({
      where: { userId },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      take: 5,
    }),
  ]);

  let context = "## User Context\n\n";

  if (preferences) {
    context += `**Preferences:** Language: ${preferences.language}, Timezone: ${preferences.timezone}, Style: ${preferences.responseStyle}\n\n`;
  }

  if (goals.length > 0) {
    context += "**Active Goals:**\n";
    goals.forEach((g) => {
      context += `- ${g.title} (${g.progress}% complete)\n`;
    });
    context += "\n";
  }

  if (recentMemories.length > 0) {
    context += "**Recent Context:**\n";
    recentMemories.slice(0, 10).forEach((m) => {
      context += `- [${m.type}] ${m.content.slice(0, 150)}\n`;
    });
  }

  return context;
}
