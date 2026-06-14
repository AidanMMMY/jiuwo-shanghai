'use client';

import { useState, useCallback } from 'react';
import { sendDarkroomMessage, type ChatMessage } from '@/lib/darkroom';

function getNowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

export interface UseDarkroomChatOptions {
  isZh?: boolean;
  onMemoryExtracted?: (stored: number) => void;
}

export interface UseDarkroomChatReturn {
  history: ChatMessage[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
}

export function useDarkroomChat({ isZh = false, onMemoryExtracted }: UseDarkroomChatOptions): UseDarkroomChatReturn {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const timestamp = getNowTime();
    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await sendDarkroomMessage(trimmed, history, isZh);
      const assistantTimestamp = getNowTime();
      const assistantMessage: ChatMessage = { role: 'assistant', content: res.content, timestamp: assistantTimestamp };
      setHistory([...newHistory, assistantMessage]);

      // Fire-and-forget memory extraction
      fetch('/api/darkroom/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, assistantResponse: res.content, isZh }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.stored > 0) {
            onMemoryExtracted?.(json.stored);
          }
        })
        .catch(() => {
          // Extraction is optional — silently ignore failures
        });
    } catch (err) {
      const errorTimestamp = getNowTime();
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? err.message : (isZh ? '信号丢失' : 'Signal lost'),
        timestamp: errorTimestamp,
      };
      setHistory([...newHistory, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [history, loading, isZh, onMemoryExtracted]);

  return { history, loading, sendMessage };
}
