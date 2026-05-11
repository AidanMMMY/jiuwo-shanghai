"use client";

import { useState, useCallback } from "react";

export interface KimiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface KimiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export function useKimi() {
  const [response, setResponse] = useState<string>("");
  const [usage, setUsage] = useState<KimiUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: KimiMessage[]) => {
    setLoading(true);
    setError(null);
    setResponse("");
    setUsage(null);

    try {
      const res = await fetch("/api/kimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();
      setResponse(data.content);
      setUsage(data.usage);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { response, usage, loading, error, chat };
}
