import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { Message } from "@anthropic-ai/sdk/resources/messages";

if (!config.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY not set — Anthropic features disabled");
}

export const anthropicClient = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY || "placeholder",
});

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  tools?: Anthropic.Tool[];
}

export async function streamAnthropicResponse(
  messages: AnthropicMessage[],
  options: StreamOptions = {},
  onDelta: (delta: string) => void,
  onToolCall?: (toolUse: Anthropic.ToolUseBlock) => void
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const {
    model = "claude-sonnet-4-6",
    maxTokens = 4096,
    temperature = 0.7,
    system,
    tools,
  } = options;

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = anthropicClient.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages,
    tools,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullContent += event.delta.text;
      onDelta(event.delta.text);
    }

    if (
      event.type === "content_block_stop" &&
      onToolCall
    ) {
      const block = (stream as any).currentMessage?.content?.find(
        (b: { type: string }) => b.type === "tool_use"
      );
      if (block) onToolCall(block);
    }

    if (event.type === "message_delta" && event.usage) {
      outputTokens = event.usage.output_tokens;
    }

    if (event.type === "message_start" && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    }
  }

  return { content: fullContent, inputTokens, outputTokens };
}

export async function callAnthropicWithTools(
  messages: AnthropicMessage[],
  tools: Anthropic.Tool[],
  options: StreamOptions = {}
): Promise<Message> {
  return anthropicClient.messages.create({
    model: options.model || "claude-sonnet-4-6",
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages,
    tools,
  });
}
