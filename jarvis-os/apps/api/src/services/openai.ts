import { config } from "../config";

// OpenAI is fully optional. Transcription falls back to the Python AI service
// (local Whisper). Embeddings fall back to the Python AI service (fastembed).
// Chat uses Anthropic by default and only picks OpenAI when explicitly requested.

let _openaiClient: import("openai").default | null = null;

function getOpenAIClient() {
  if (!config.OPENAI_API_KEY) return null;
  if (!_openaiClient) {
    const OpenAI = require("openai").default;
    _openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return _openaiClient;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  const client = getOpenAIClient();

  if (client) {
    const file = new File([audioBuffer], "audio.webm", { type: mimeType });
    const response = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "json",
    });
    return response.text;
  }

  // Fallback: proxy to Python AI service (runs local Whisper)
  const aiServiceUrl = config.AI_SERVICE_URL;
  const FormData = require("form-data");
  const form = new FormData();
  form.append("audio", audioBuffer, { filename: "audio.webm", contentType: mimeType });

  const response = await fetch(`${aiServiceUrl}/api/v1/voice/transcribe`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { data?: { text?: string } };
  return data?.data?.text ?? "";
}

export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  if (client) {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  }

  // Fallback: Python AI service (fastembed — free, local)
  const aiServiceUrl = config.AI_SERVICE_URL;
  const response = await fetch(`${aiServiceUrl}/api/v1/memory/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const data = (await response.json()) as { data?: { embedding?: number[] } };
  return data?.data?.embedding ?? [];
}

export async function createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => createEmbedding(t)));
}

// Only called when caller explicitly requests an OpenAI model
export async function streamOpenAIResponse(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
  onDelta: (delta: string) => void
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { model = "gpt-4o", temperature = 0.7, maxTokens = 4096 } = options;
  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: messages as any,
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
