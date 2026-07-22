'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSessionSocket } from '@/lib/ws';
import { SessionMessage } from '@/types/session';

export function useBridgeVoiceSession(sessionId: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SessionMessage[]>([]);

  useEffect(() => {
    const socket = createSessionSocket(
      sessionId,
      (msg) =>
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (
            msg.type === 'transcript' &&
            last?.type === 'transcript' &&
            last.payload === msg.payload
          ) {
            return prev;
          }
          return [...prev, msg];
        }),
      () => setConnected(true),
      () => setConnected(false)
    );

    socketRef.current = socket;
    return () => socket?.close();
  }, [sessionId]);

  const sendText = useCallback(
    (text: string, targetLanguage?: 'English' | 'Spanish' | 'French' | 'Hindi') => {
      const cleaned = text.trim();
      if (!cleaned) return;

      // Optimistic transcript so speech appears immediately even if websocket is delayed.
      setMessages((prev) => [
        ...prev,
        {
          type: 'transcript',
          payload: cleaned,
          timestamp: new Date().toISOString()
        }
      ]);

      if (connected && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'text',
            text: cleaned,
            target_language: targetLanguage
          })
        );
      }
    },
    [connected]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { connected, messages, sendText, clearMessages };
}
