"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onResponse?: (audio: string) => void;
}

type RecordingState = "idle" | "recording" | "processing";

export function VoiceButton({ onTranscript, onResponse }: VoiceButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const result = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/voice/transcribe`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("jarvis-token")}`,
              },
              body: formData,
            }
          ).then((r) => r.json());

          if (result.data?.text) {
            onTranscript(result.data.text);
          }
        } finally {
          setState("idle");
        }
      };

      mediaRecorder.start(100);
      setState("recording");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setState("idle");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleMouseDown = () => startRecording();
  const handleMouseUp = () => {
    if (state === "recording") stopRecording();
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      disabled={state === "processing"}
      className={cn(
        "p-2 rounded-lg transition-all duration-200 select-none",
        state === "recording"
          ? "bg-red-500/20 text-red-400 border border-red-500/40 voice-pulse"
          : state === "processing"
          ? "bg-yellow-500/20 text-yellow-400"
          : "hover:bg-white/10 text-muted-foreground"
      )}
      title="Hold to record voice"
    >
      {state === "processing" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : state === "recording" ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
