"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useJarvisStore } from "@/store";
import { WEBSOCKET_EVENTS } from "@jarvis/shared";

let socket: Socket | null = null;

export function useWebSocket() {
  const { token, setWsConnected } = useJarvisStore();
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  useEffect(() => {
    if (!token) return;

    socket = io(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setWsConnected(true);
    });

    socket.on("disconnect", () => {
      setWsConnected(false);
    });

    // Forward all events to registered handlers
    Object.values(WEBSOCKET_EVENTS).forEach((event) => {
      socket?.on(event, (data: unknown) => {
        const handlers = handlersRef.current.get(event);
        handlers?.forEach((h) => h(data));
      });
    });

    return () => {
      socket?.disconnect();
      socket = null;
      setWsConnected(false);
    };
  }, [token]);

  const on = useCallback(
    (event: string, handler: (data: unknown) => void) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);

      return () => {
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    []
  );

  const emit = useCallback((event: string, data: unknown) => {
    socket?.emit(event, data);
  }, []);

  return { socket, on, emit };
}
