export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceConfig {
  enabled: boolean;
  wakeWord: string;
  wakeWordSensitivity: number;
  continuousListening: boolean;
  language: string;
  voiceId: string;
  speechRate: number;
  pitch: number;
  interruptible: boolean;
  noiseThreshold: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  segments?: TranscriptionSegment[];
  duration: number;
}

export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SpeechSynthesisRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  outputFormat?: "mp3_44100_128" | "pcm_16000" | "pcm_22050" | "pcm_24000";
}

export interface WakeWordEvent {
  keyword: string;
  score: number;
  timestamp: number;
}

export interface VoiceSessionEvent {
  type:
    | "wake_word"
    | "speech_start"
    | "speech_end"
    | "transcription"
    | "response_start"
    | "response_end"
    | "error"
    | "interrupted";
  data?: unknown;
  timestamp: number;
}

export interface AudioChunk {
  data: ArrayBuffer | Buffer;
  sampleRate: number;
  channels: number;
  timestamp: number;
}
