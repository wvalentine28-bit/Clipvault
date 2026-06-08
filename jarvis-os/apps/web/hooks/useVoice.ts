"use client";

import { useState, useCallback, useRef } from "react";
import { useJarvisStore } from "@/store";
import type { VoiceState } from "@jarvis/shared";

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { token } = useJarvisStore();

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");

        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "voice.webm");

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/voice/process`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token || localStorage.getItem("jarvis-token")}`,
              },
              body: formData,
            }
          ).then((r) => r.json());

          if (res.data?.transcript) {
            setTranscript(res.data.transcript);
          }

          if (res.data?.audioBase64) {
            setState("speaking");
            const audio = new Audio(
              `data:audio/mpeg;base64,${res.data.audioBase64}`
            );
            audio.onended = () => setState("idle");
            audio.play();
          } else {
            setState("idle");
          }
        } catch {
          setState("error");
          setTimeout(() => setState("idle"), 2000);
        }
      };

      recorder.start();
      setState("listening");
    } catch (err) {
      console.error("Voice error:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [token]);

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (state === "idle") {
      startListening();
    } else if (state === "listening") {
      stopListening();
    }
  }, [state, startListening, stopListening]);

  return { state, transcript, toggle, startListening, stopListening };
}
