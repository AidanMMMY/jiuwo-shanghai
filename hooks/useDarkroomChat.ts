'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { sendDarkroomMessage, type ChatMessage } from '@/lib/darkroom';

function getNowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

const MAX_STORED_MESSAGES = 20;

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

  // Use refs to avoid stale closures and race conditions
  const historyRef = useRef(history);
  const loadingRef = useRef(loading);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep refs in sync with state
  historyRef.current = history;
  loadingRef.current = loading;

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    const timestamp = getNowTime();
    const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp };

    // Use functional update to always work with latest history
    let currentHistory: ChatMessage[] = [];
    setHistory((prev) => {
      currentHistory = [...prev, userMessage];
      return currentHistory;
    });

    setLoading(true);
    loadingRef.current = true;

    try {
      // Pass the latest history including the user message
      const res = await sendDarkroomMessage(trimmed, currentHistory, isZh);
      const assistantTimestamp = getNowTime();
      const assistantMessage: ChatMessage = { role: 'assistant', content: res.content, timestamp: assistantTimestamp };

      setHistory((prev) => [...prev, assistantMessage]);

      // Abort any previous extract fetch before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Fire-and-forget memory extraction with abort/cleanup
      fetch('/api/darkroom/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, assistantResponse: res.content, isZh }),
        signal: abortControllerRef.current.signal,
      })
        .then((r) => {
          if (!r.ok) {
            throw new Error(`HTTP ${r.status}`);
          }
          return r.json();
        })
        .then((json) => {
          if (json.stored > 0) {
            onMemoryExtracted?.(json.stored);
          }
        })
        .catch(() => {
          // Extraction is optional — silently ignore failures (including abort)
        });
    } catch (err) {
      const errorTimestamp = getNowTime();
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? err.message : (isZh ? '信号丢失' : 'Signal lost'),
        timestamp: errorTimestamp,
      };
      setHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isZh, onMemoryExtracted]);

  // Cleanup abort controller on unmount
  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  return { history, loading, sendMessage };
}
