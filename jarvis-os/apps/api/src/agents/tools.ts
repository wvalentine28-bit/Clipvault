import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../config";
import { saveMemory, searchMemories } from "../services/memory";
import { logger } from "../index";

// ─── WEB SEARCH ──────────────────────────────────────────────

const webSearchSchema = z.object({
  query: z.string().describe("The search query"),
  maxResults: z.number().optional().describe("Number of results (default 5)"),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const webSearchTool = tool(
  async ({ query, maxResults = 5 }: z.infer<typeof webSearchSchema>) => {
    try {
      if (config.TAVILY_API_KEY) {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.TAVILY_API_KEY}`,
          },
          body: JSON.stringify({
            query,
            max_results: maxResults,
            search_depth: "advanced",
            include_answer: true,
          }),
        });
        const data = (await response.json()) as {
          answer?: string;
          results: Array<{
            title: string;
            url: string;
            content: string;
            score: number;
          }>;
        };
        return JSON.stringify({
          answer: data.answer,
          results: data.results?.slice(0, maxResults).map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content.slice(0, 500),
            score: r.score,
          })),
        });
      }

      if (config.SERPAPI_API_KEY) {
        const params = new URLSearchParams({
          q: query,
          api_key: config.SERPAPI_API_KEY,
          num: maxResults.toString(),
        });
        const response = await fetch(
          `https://serpapi.com/search.json?${params}`
        );
        const data = (await response.json()) as {
          organic_results: Array<{
            title: string;
            link: string;
            snippet: string;
            position: number;
          }>;
        };
        return JSON.stringify(
          data.organic_results?.slice(0, maxResults).map((r) => ({
            title: r.title,
            url: r.link,
            snippet: r.snippet,
          }))
        );
      }

      return JSON.stringify({
        error: "No search API configured",
        message: "Please configure TAVILY_API_KEY or SERPAPI_API_KEY",
      });
    } catch (err) {
      logger.error({ err }, "Web search failed");
      return JSON.stringify({ error: "Search failed", message: String(err) });
    }
  },
  {
    name: "web_search",
    description: "Search the internet for current information on any topic",
    schema: webSearchSchema,
  }
);

// ─── MEMORY TOOLS ────────────────────────────────────────────

const memorySearchSchema = z.object({
  query: z.string().describe("What to search for in memory"),
  userId: z.string().describe("User ID"),
  types: z
    .array(z.string())
    .optional()
    .describe("Memory types to filter by"),
  limit: z.number().optional().describe("Max results"),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const memorySearchTool = tool(
  async ({ query, userId, types, limit }: z.infer<typeof memorySearchSchema>) => {
    const results = await searchMemories({ query, userId, types, limit });
    return JSON.stringify(results);
  },
  {
    name: "search_memory",
    description: "Search the user's long-term memory for relevant information",
    schema: memorySearchSchema,
  }
);

const memorySaveSchema = z.object({
  userId: z.string(),
  type: z
    .enum([
      "conversation",
      "preference",
      "fact",
      "goal",
      "project",
      "skill",
      "person",
      "event",
    ])
    .describe("Type of memory"),
  content: z.string().describe("The content to remember"),
  importance: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .describe("How important this memory is"),
  tags: z.array(z.string()).optional().describe("Tags for the memory"),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const memorySaveTool = tool(
  async ({ userId, type, content, importance, tags }: z.infer<typeof memorySaveSchema>) => {
    const memory = await saveMemory({ userId, type, content, importance, tags });
    return JSON.stringify({ success: true, id: (memory as { id: string }).id });
  },
  {
    name: "save_memory",
    description: "Save important information to the user's long-term memory",
    schema: memorySaveSchema,
  }
);

// ─── CODE EXECUTION ──────────────────────────────────────────

const codeAnalysisSchema = z.object({
  code: z.string().describe("The code to analyze"),
  language: z.string().describe("Programming language"),
  task: z
    .string()
    .describe("What to do with the code (analyze/explain/find bugs)"),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const codeAnalysisTool = tool(
  async ({ code, language, task }: z.infer<typeof codeAnalysisSchema>) => {
    const prompt = `Analyze this ${language} code and ${task}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    return JSON.stringify({ analysis: prompt, language, task });
  },
  {
    name: "analyze_code",
    description: "Analyze, review, or explain code",
    schema: codeAnalysisSchema,
  }
);

// ─── CALENDAR & TASKS ────────────────────────────────────────

const createTaskSchema = z.object({
  userId: z.string(),
  title: z.string().describe("Task title"),
  description: z.string().optional().describe("Task description"),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .optional()
    .describe("Task priority"),
  dueDate: z.string().optional().describe("Due date in ISO format"),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const createTaskTool = tool(
  async ({ title, description, priority, dueDate, userId }: z.infer<typeof createTaskSchema>) => {
    const { prisma } = await import("@jarvis/database");
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        description,
        priority: (priority || "MEDIUM").toUpperCase() as any,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: "TODO",
      },
    });
    return JSON.stringify({ success: true, task });
  },
  {
    name: "create_task",
    description: "Create a new task for the user",
    schema: createTaskSchema,
  }
);

const getTasksSchema = z.object({
  userId: z.string(),
  status: z
    .enum(["todo", "in_progress", "blocked", "done", "cancelled"])
    .optional(),
  limit: z.number().optional(),
});

// @ts-ignore — LangChain tool() schema inference exceeds TS depth limit
export const getTasksTool = tool(
  async ({ userId, status, limit }: z.infer<typeof getTasksSchema>) => {
    const { prisma } = await import("@jarvis/database");
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status && { status: status.toUpperCase() as any }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit || 20,
    });
    return JSON.stringify(tasks);
  },
  {
    name: "get_tasks",
    description: "Get the user's tasks",
    schema: getTasksSchema,
  }
);

export const ALL_TOOLS = [
  webSearchTool,
  memorySearchTool,
  memorySaveTool,
  codeAnalysisTool,
  createTaskTool,
  getTasksTool,
];
