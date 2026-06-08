import { config } from "../config";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string = config.ELEVENLABS_VOICE_ID,
  settings: VoiceSettings = { stability: 0.5, similarity_boost: 0.75 }
): Promise<Buffer> {
  if (!config.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: settings,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function streamSpeech(
  text: string,
  voiceId: string = config.ELEVENLABS_VOICE_ID,
  settings: VoiceSettings = { stability: 0.5, similarity_boost: 0.75 }
): Promise<ReadableStream<Uint8Array>> {
  if (!config.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: settings,
        optimize_streaming_latency: 3,
      }),
    }
  );

  if (!response.ok || !response.body) {
    throw new Error(`ElevenLabs stream error: ${response.status}`);
  }

  return response.body;
}

export async function getAvailableVoices() {
  if (!config.ELEVENLABS_API_KEY) return [];

  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: { "xi-api-key": config.ELEVENLABS_API_KEY },
  });

  if (!response.ok) return [];
  const data = (await response.json()) as { voices: unknown[] };
  return data.voices || [];
}
