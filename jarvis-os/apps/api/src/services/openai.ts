import OpenAI from "openai";
import { config } from "../config";

if (!config.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set — OpenAI features disabled");
}

export const openaiClient = new OpenAI({
  apiKey: config.OPENAI_API_KEY || "placeholder",
});

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  const file = new File([audioBuffer], "audio.webm", { type: mimeType });

  const response = await openaiClient.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "json",
  });

  return response.text;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

export async function createEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  });
  return response.data.map((d) => d.embedding);
}

export async function streamOpenAIResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: OpenAI.Chat.ChatCompletionTool[];
  } = {},
  onDelta: (delta: string) => void
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const {
    model = "gpt-4o",
    temperature = 0.7,
    maxTokens = 4096,
    tools,
  } = options;

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await openaiClient.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
    tools,
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      fullContent += delta;
      onDelta(delta);
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
  }

  return { content: fullContent, inputTokens, outputTokens };
}
