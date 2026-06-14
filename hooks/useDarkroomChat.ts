'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { sendDarkroomMessage, type ChatMessage } from '@/lib/darkroom';

function getNowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

const STORAGE_KEY = 'darkroom-chat-history';
const MAX_STORED_MESSAGES = 20;

function loadStoredHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (m): m is ChatMessage =>
          m &&
          typeof m === 'object' &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          typeof m.timestamp === 'string'
      );
    }
  } catch {
    // Ignore corrupted storage
  }
  return [];
}

function saveStoredHistory(history: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // Storage may be unavailable or full; chat continues regardless
  }
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
  const [history, setHistory] = useState<ChatMessage[]>(() => loadStoredHistory());
  const [loading, setLoading] = useState(false);

  // Use refs to avoid stale closures and race conditions
  const historyRef = useRef(history);
  const loadingRef = useRef(loading);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep refs in sync with state
  historyRef.current = history;
  loadingRef.current = loading;

  // Persist history across language switches (same tab only)
  useEffect(() => {
    saveStoredHistory(history);
  }, [history]);

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
