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

const TYPE_SPEED = 15; // ms per char — fast retro terminal feel

function getNowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function useTypewriter(text: string, speed = TYPE_SPEED, onDone?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  // Keep onDone ref fresh without restarting the interval
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }
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
          onDoneRef.current?.();
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

export default function DarkroomTerminal({ isZh = false }: { isZh?: boolean }) {
  const data = getDarkroomData(isZh);

  // Static fallback entries — used while generating or on error
  const staticEntries: DisplayEntry[] = data.initialEntries.map(
    (e: DarkroomEntry, i: number) => ({
      ...e,
      id: `init-${i}`,
      type: e.type as 'log' | 'broadcast',
      isTyping: true,
    })
  );
  const staticQueue = staticEntries.map((_, i) => `init-${i}`);

  const [entries, setEntries] = useState<DisplayEntry[]>(staticEntries);
  const [typingQueue, setTypingQueue] = useState<string[]>(staticQueue);
  const [initPhase, setInitPhase] = useState<'loading' | 'ready'>('loading');

  // Fetch dynamically generated initial entries (Matrix/Black Mirror style)
  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setInitPhase('ready'); // fallback to static after 5s
    }, 5000);

    async function load() {
      try {
        const res = await fetch('/api/darkroom/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isZh }),
        });
        const json = await res.json();
        if (!cancelled && json.entries?.length) {
          const generated: DisplayEntry[] = json.entries.map(
            (e: Record<string, unknown>, i: number) => ({
              id: `gen-${i}`,
              timestamp: (e.timestamp as string) || '02:33:08',
              location: (e.location as string) || (isZh ? '系统' : 'SYSTEM'),
              action: (e.action as string) || '',
              message: (e.message as string) || '',
              tags: Array.isArray(e.tags)
                ? (e.tags as string[]).filter((t: unknown) => typeof t === 'string')
                : undefined,
              type: (e.type === 'broadcast' ? 'broadcast' : 'log') as 'log' | 'broadcast',
              isTyping: true,
            })
          );
          setEntries(generated);
          setTypingQueue(generated.map((_, i) => `gen-${i}`));
        }
      } catch {
        // Keep static entries
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          setInitPhase('ready');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [isZh]);

  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [exchangeCount, setExchangeCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  // Intersection Observer — start typing when terminal enters viewport
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHasEnteredViewport(true);
      },
      { threshold: 0 }
    );
    observer.observe(terminal);
    return () => observer.disconnect();
  }, []);

  // Pull next item from queue when idle (only after entering viewport + entries ready)
  useEffect(() => {
    if (!hasEnteredViewport || initPhase !== 'ready') return;
    if (currentTypingId === null && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue;
      setCurrentTypingId(next);
      setTypingQueue(rest);
    }
  }, [hasEnteredViewport, initPhase, currentTypingId, typingQueue]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentTypingId]);

  // Note: removed visualViewport auto-scroll — iOS toolbar show/hide during
  // normal scrolling also fires resize events, causing false-positive triggers.

  // Called when an entry finishes typing
  const handleTypingDone = useCallback((entryId: string) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, isTyping: false } : e
    ));
    setCurrentTypingId(null);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userEntry: DisplayEntry = {
      id: `user-${Date.now()}`,
      timestamp: getNowTime(),
      message: text,
      type: 'user',
      isTyping: false, // user input appears instantly
    };

    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setLoading(true);

    const newHistory: ChatMessage[] = [
      ...history,
      { role: 'user', content: text, timestamp: getNowTime() },
    ];

    try {
      const res = await sendDarkroomMessage(text, history, isZh);
      const aiId = `sys-${Date.now()}`;
      const assistantEntry: DisplayEntry = {
        id: aiId,
        timestamp: getNowTime(),
        location: res.source === 'fallback' ? (isZh ? '本地' : 'LOCAL') : (isZh ? '外部' : 'EXTERNAL'),
        action: isZh ? '> 响应已接收' : '> Response received',
        message: res.content,
        type: 'system',
        isTyping: true,
      };

      setHistory([...newHistory, { role: 'assistant', content: res.content, timestamp: getNowTime() }]);
      setEntries(prev => [...prev, assistantEntry]);
      setTypingQueue(prev => [...prev, aiId]);

      // Increment exchange count and trigger memory extraction every 3 user messages
      const nextExchangeCount = exchangeCount + 1;
      setExchangeCount(nextExchangeCount);

      if (nextExchangeCount % 3 === 0) {
        fetch('/api/darkroom/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: text, assistantResponse: res.content, isZh }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.stored > 0 && Math.random() < 0.3) {
              const feedbackId = `mem-${Date.now()}`;
              const feedbackEntry: DisplayEntry = {
                id: feedbackId,
                timestamp: getNowTime(),
                location: isZh ? '系统' : 'SYSTEM',
                action: isZh ? '> 痕迹已归档' : '> Trace archived',
                message: isZh
                  ? '构造体记住了。你的信号已被加入本地回路。'
                  : 'The construct remembers. Your signal has been added to the local loop.',
                type: 'log',
                isTyping: true,
              };
              setEntries(prev => [...prev, feedbackEntry]);
              setTypingQueue(prev => [...prev, feedbackId]);
            }
          })
          .catch(() => {
            // Extraction is optional — silently ignore failures
          });
      }
    } catch (err) {
      const errId = `err-${Date.now()}`;
      const errorEntry: DisplayEntry = {
        id: errId,
        timestamp: getNowTime(),
        location: isZh ? '错误' : 'ERROR',
        action: isZh ? '> 连接失败' : '> Connection failed',
        message: err instanceof Error ? err.message : 'Signal lost',
        type: 'system',
        isTyping: true,
      };
      setEntries(prev => [...prev, errorEntry]);
      setTypingQueue(prev => [...prev, errId]);
    } finally {
      setLoading(false);
      // Blur on mobile so the keyboard closes and iOS zoom resets
      setTimeout(() => inputRef.current?.blur(), 100);
    }
  }, [input, loading, history, exchangeCount, isZh]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // After mobile keyboard closes, re-anchor terminal into viewport
  const handleInputBlur = () => {
    if (typeof window === 'undefined' || !terminalRef.current) return;
    setTimeout(() => {
      const rect = terminalRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        // Terminal is entirely outside viewport — scroll it back
        terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 350); // Wait for keyboard close animation
  };

  return (
    <section className="px-4 md:px-12 pt-20 pb-4 bg-[#0a0a0a]">
      <div className="mx-auto max-w-4xl">
        <div className="darkroom-terminal" ref={terminalRef}>
          <div className="darkroom-terminal-screen" ref={scrollRef}>
            {/* Signal header */}
            <div className="darkroom-signal-header">
              <span>{isZh ? '信号' : 'SIGNAL'} <strong>118.7 MHz</strong></span>
              <span>{isZh ? '来源' : 'ORIGIN'} <span style={{ color: '#6a4040' }}>{isZh ? '未追踪' : 'UNTRACED'}</span></span>
              <span>{isZh ? '强度' : 'STRENGTH'} <span className="darkroom-freq-bar" /></span>
              <span>{isZh ? '模式' : 'MODE'} <span style={{ color: '#4a6a6a' }}>{isZh ? '营业时间外' : 'AFTER HOURS'}</span></span>
            </div>

            <div className="darkroom-terminal-entries">
              {hasEnteredViewport && initPhase === 'loading' && (
                <div className="darkroom-log-entry">
                  <pre className="darkroom-log-typing">
                    {isZh
                      ? `[${getNowTime()}] · 系统\n> 正在初始化诊断界面……\n_`
                      : `[${getNowTime()}] · SYSTEM\n> Initializing diagnostic interface...\n_`}
                  </pre>
                </div>
              )}
              {entries.map((entry) => {
                const inQueue = typingQueue.includes(entry.id);
                const isCurrent = entry.id === currentTypingId;
                const shouldShow = entry.type === 'user' || isCurrent || !inQueue;
                if (!shouldShow) return null;
                return (
                  <EntryItem
                    key={entry.id}
                    entry={entry}
                    isActiveTyping={isCurrent}
                    onDone={isCurrent ? () => handleTypingDone(entry.id) : undefined}
                    isZh={isZh}
                  />
                );
              })}

              {loading && (
                <div className="darkroom-log-entry">
                  <pre className="darkroom-log-typing">
                    {isZh
                      ? `[${getNowTime()}] · 等待中\n> 接收信号中……\n_`
                      : `[${getNowTime()}] · PENDING\n> Receiving transmission...\n_`}
                  </pre>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="darkroom-input-line">
              <span className="darkroom-prompt">{'>'}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleInputBlur}
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

function getEntryText(entry: DisplayEntry, isZh: boolean): string {
  if (entry.type === 'user') {
    return `[${entry.timestamp}] · ${isZh ? '用户输入' : 'USER INPUT'}\n> ${entry.message}`;
  }
  if (entry.type === 'broadcast') {
    return `▓░▓▓░▒░░▓░▒▓░▒░\n[${entry.timestamp}] · ${entry.location || (isZh ? '广播' : 'BROADCAST')}\n> ${entry.action || (isZh ? '广播' : 'Broadcast')}\n"${entry.message}"`;
  }
  let text = `[${entry.timestamp}] · ${entry.location || (isZh ? '系统' : 'SYSTEM')}\n> ${entry.action || (isZh ? '系统消息' : 'System message')}\n${entry.message}`;
  if (entry.tags && entry.tags.length > 0) {
    text += '\n' + entry.tags.map((t) => `[${t}]`).join(' ');
  }
  return text;
}

function EntryItem({ entry, isActiveTyping, onDone, isZh }: { entry: DisplayEntry; isActiveTyping: boolean; onDone?: () => void; isZh: boolean }) {
  const text = getEntryText(entry, isZh);
  const typed = useTypewriter(isActiveTyping ? text : '', TYPE_SPEED, onDone);
  const display = isActiveTyping ? typed : text;

  return (
    <div className="darkroom-log-entry">
      <pre className="darkroom-log-typing">{display}</pre>
    </div>
  );
}
