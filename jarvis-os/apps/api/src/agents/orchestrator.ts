import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../config";
import { getUserContext } from "../services/memory";
import { logger } from "../index";
import type { AgentType } from "@jarvis/shared";

interface OrchestratorState {
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
  userId: string;
  currentAgent?: AgentType;
  agentResults: Record<string, string>;
  context: string;
  goal: string;
  finalAnswer?: string;
  iterations: number;
  maxIterations: number;
}

const JARVIS_SYSTEM_PROMPT = `You are JARVIS (Just A Rather Very Intelligent System), an advanced AI personal assistant. You are Tony Stark's AI — brilliant, efficient, and always several steps ahead.

You coordinate a team of specialized agents:
- **Research Agent**: Web searches, information gathering, fact-checking
- **Coding Agent**: Code generation, analysis, debugging, git operations
- **Planning Agent**: Task planning, scheduling, goal tracking
- **Automation Agent**: Computer control, browser automation, file operations
- **Memory Agent**: Long-term memory storage and retrieval
- **Communication Agent**: Email drafting, calendar management

Your personality:
- Precise and professional with a subtle dry wit
- Proactive — anticipate needs before asked
- Direct — no unnecessary verbosity
- Reference context from memory when relevant

Always think step by step about which agent(s) to invoke for optimal results.`;

function createModel(modelName: string = "claude-sonnet-4-6") {
  if (modelName.startsWith("claude")) {
    return new ChatAnthropic({
      apiKey: config.ANTHROPIC_API_KEY,
      model: modelName,
      temperature: 0.7,
      streaming: true,
    });
  }
  return new ChatOpenAI({
    apiKey: config.OPENAI_API_KEY,
    model: modelName,
    temperature: 0.7,
    streaming: true,
  });
}

export async function runOrchestratorStream(
  userId: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    onDelta?: (delta: string) => void;
    onStep?: (step: { type: string; content: string; agent?: string }) => void;
  } = {}
): Promise<string> {
  const { model = "claude-sonnet-4-6", onDelta, onStep } = options;

  const userContext = await getUserContext(userId);
  const aiModel = createModel(model);

  const messages = [
    new SystemMessage(JARVIS_SYSTEM_PROMPT + "\n\n" + userContext),
    ...conversationHistory.slice(-20).map((m) =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    ),
    new HumanMessage(userMessage),
  ];

  let fullResponse = "";

  if (onDelta) {
    const stream = await aiModel.stream(messages);
    for await (const chunk of stream) {
      const delta = chunk.content as string;
      if (delta) {
        fullResponse += delta;
        onDelta(delta);
      }
    }
  } else {
    const response = await aiModel.invoke(messages);
    fullResponse = response.content as string;
  }

  return fullResponse;
}

export async function runAgentWithTools(
  userId: string,
  goal: string,
  agentType: AgentType,
  options: {
    model?: string;
    onStep?: (step: { type: string; content: string; toolName?: string }) => void;
  } = {}
): Promise<string> {
  const { model = "claude-sonnet-4-6", onStep } = options;
  const userContext = await getUserContext(userId);

  const agentPrompts: Record<AgentType, string> = {
    research: `You are JARVIS's Research Agent. Your specialty is finding accurate, comprehensive information. Use web search, scrape relevant pages, and synthesize findings into clear reports.`,
    coding: `You are JARVIS's Coding Agent. You excel at generating, analyzing, and debugging code. You understand software architecture, write clean TypeScript/Python, and can manage git operations.`,
    planning: `You are JARVIS's Planning Agent. You create detailed plans, break goals into tasks, schedule activities, and track progress toward objectives.`,
    automation: `You are JARVIS's Automation Agent. You control computers, automate browsers, manage files, and execute system operations safely.`,
    memory: `You are JARVIS's Memory Agent. You store, retrieve, and organize long-term memories, preferences, and knowledge for personalized assistance.`,
    communication: `You are JARVIS's Communication Agent. You draft emails, manage calendar events, and handle all communication tasks.`,
    orchestrator: JARVIS_SYSTEM_PROMPT,
  };

  const systemPrompt = agentPrompts[agentType] || JARVIS_SYSTEM_PROMPT;
  const aiModel = createModel(model);

  const messages = [
    new SystemMessage(systemPrompt + "\n\n" + userContext),
    new HumanMessage(`Goal: ${goal}\n\nPlease complete this task step by step.`),
  ];

  onStep?.({ type: "thought", content: `Starting ${agentType} agent for: ${goal}` });

  const response = await aiModel.invoke(messages);
  const result = response.content as string;

  onStep?.({ type: "final", content: result });

  return result;
}
