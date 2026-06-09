'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getDarkroomData, sendDarkroomMessage, type ChatMessage, type DarkroomEntry } from '@/lib/darkroom';

interface DisplayEntry {
  id: string;
  timestamp: string;
  location?: string;
  action?: string;
  message: string;
  tags?: string[];
  type: 'log' | 'broadcast' | 'user' | 'system';
  isTyping?: boolean;
}

const STORAGE_KEY = 'jiuwo-darkroom-chat';

function getNowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function useTypewriter(text: string, speed = 30, onDone?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    doneRef.current = false;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onDone]);

  return displayed;
}

export default function DarkroomTerminal({ isZh = false }: { isZh?: boolean }) {
  const data = getDarkroomData();
  const [entries, setEntries] = useState<DisplayEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { /* ignore */ }
      }
    }
    return data.initialEntries.map((e: DarkroomEntry) => ({
      ...e,
      type: e.type as 'log' | 'broadcast',
    }));
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userEntry: DisplayEntry = {
      id: `user-${Date.now()}`,
      timestamp: getNowTime(),
      message: text,
      type: 'user',
    };

    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setLoading(true);

    const newHistory: ChatMessage[] = [
      ...history,
      { role: 'user', content: text, timestamp: getNowTime() },
    ];

    try {
      const res = await sendDarkroomMessage(text, history);
      const assistantEntry: DisplayEntry = {
        id: `sys-${Date.now()}`,
        timestamp: getNowTime(),
        location: res.source === 'fallback' ? 'LOCAL' : 'EXTERNAL',
        action: '> Response received',
        message: res.content,
        type: 'system',
        isTyping: true,
      };

      setHistory([...newHistory, { role: 'assistant', content: res.content, timestamp: getNowTime() }]);
      setEntries(prev => [...prev, assistantEntry]);
    } catch (err) {
      const errorEntry: DisplayEntry = {
        id: `err-${Date.now()}`,
        timestamp: getNowTime(),
        location: 'ERROR',
        action: '> Connection failed',
        message: err instanceof Error ? err.message : 'Signal lost',
        type: 'system',
        isTyping: true,
      };
      setEntries(prev => [...prev, errorEntry]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="px-4 md:px-8 pt-20 pb-4 bg-[#0a0a0a]">
      <div className="mx-auto max-w-4xl">
        <div className="darkroom-terminal">
          <div className="darkroom-terminal-screen" ref={screenRef}>
            {/* Signal header */}
            <div className="darkroom-signal-header">
              <span>SIGNAL <strong>118.7 MHz</strong></span>
              <span>ORIGIN <span style={{ color: '#6a4040' }}>UNTRACED</span></span>
              <span>STRENGTH <span className="darkroom-freq-bar" /></span>
              <span>MODE <span style={{ color: '#4a6a6a' }}>AFTER HOURS</span></span>
            </div>

            {/* Entries */}
            {entries.map((entry) => (
              <EntryItem key={entry.id} entry={entry} />
            ))}

            {loading && (
              <div className="darkroom-log-entry">
                <div className="darkroom-log-time">{getNowTime()} · PENDING</div>
                <div className="darkroom-log-action">{'>'} Receiving transmission...</div>
                <div className="darkroom-log-msg">
                  <span className="darkroom-cursor-blink">_</span>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="darkroom-input-line">
              <span className="darkroom-prompt">{'>'}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isZh ? '输入指令...' : 'Enter command...'}
                disabled={loading}
                className="darkroom-input"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="darkroom-cursor-blink">_</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EntryItem({ entry }: { entry: DisplayEntry }) {
  const [done, setDone] = useState(!entry.isTyping);
  const typed = useTypewriter(entry.isTyping ? entry.message : '', 25, () => setDone(true));

  const displayMessage = entry.isTyping && !done ? typed : entry.message;

  if (entry.type === 'user') {
    return (
      <div className="darkroom-log-entry">
        <div className="darkroom-log-time">[{entry.timestamp}] · USER INPUT</div>
        <div className="darkroom-log-action">{'>'} {displayMessage}</div>
      </div>
    );
  }

  if (entry.type === 'broadcast') {
    return (
      <div className="darkroom-log-entry">
        <div className="darkroom-static-divider">▓░▓▓░▒░░▓░▒▓░▒░░▓▓░▒░▓░░▒▓░▒░░▓▓░</div>
        <div className="darkroom-log-time">[{entry.timestamp}] · {entry.location || 'BROADCAST'}</div>
        <div className="darkroom-log-action">{'>'} {entry.action}</div>
        <div className="darkroom-log-msg">
          <span className="darkroom-quote">{'"'}{displayMessage}{'"'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="darkroom-log-entry">
      <div className="darkroom-log-time">[{entry.timestamp}] · {entry.location || 'SYSTEM'}</div>
      <div className="darkroom-log-action">{'>'} {entry.action || 'System message'}</div>
      <div className="darkroom-log-msg">
        <span className="darkroom-quote">{displayMessage}</span>
        {entry.tags && entry.tags.length > 0 && (
          <div className="darkroom-tags">
            {entry.tags.map((tag) => (
              <span key={tag} className="darkroom-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
