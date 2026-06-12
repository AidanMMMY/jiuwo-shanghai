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

  // Always start fresh — every visit is a "first" visit
  const [entries, setEntries] = useState<DisplayEntry[]>(
    data.initialEntries.map((e: DarkroomEntry, i: number) => ({
      ...e,
      id: `init-${i}`,
      type: e.type as 'log' | 'broadcast',
      isTyping: true,
    }))
  );

  // Queue of entry IDs waiting to be typed out, one at a time
  const [typingQueue, setTypingQueue] = useState<string[]>(
    data.initialEntries.map((_, i) => `init-${i}`)
  );

  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const hasSnappedRef = useRef(false);

  // Intersection Observer — start typing + snap-to-top when scrolled into view
  // rootMargin: '-40% 0px 0px 0px' → fires when terminal top crosses 40% viewport line
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredViewport(true);

          // Snap terminal top just below navbar when crossing 40% viewport line
          if (
            !hasSnappedRef.current &&
            entry.boundingClientRect.top > 0
          ) {
            hasSnappedRef.current = true;
            const header = document.querySelector('header');
            const headerHeight = header?.getBoundingClientRect().height ?? 64;
            const gap = 16;
            const terminalTop =
              terminal.getBoundingClientRect().top + window.scrollY;
            const targetY = terminalTop - headerHeight - gap;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }

          observer.disconnect();
        }
      },
      { rootMargin: '-40% 0px 0px 0px', threshold: 0 }
    );
    observer.observe(terminal);
    return () => observer.disconnect();
  }, []);

  // Pull next item from queue when idle (only after entering viewport)
  useEffect(() => {
    if (!hasEnteredViewport) return;
    if (currentTypingId === null && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue;
      setCurrentTypingId(next);
      setTypingQueue(rest);
    }
  }, [hasEnteredViewport, currentTypingId, typingQueue]);

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
  }, [input, loading, history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
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
