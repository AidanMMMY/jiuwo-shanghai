'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDarkroomChat, type UseDarkroomChatOptions } from '@/hooks/useDarkroomChat';

// ── Types ───────────────────────────────────────────────────────────

interface DisplayEntry {
  id: string;
  timestamp: string;
  location?: string;
  action?: string;
  message: string;
  tags?: string[];
  type: 'log' | 'broadcast' | 'user' | 'system';
  isTyping: boolean;
}

interface DarkroomChatProps extends UseDarkroomChatOptions {
  mode?: 'embedded' | 'fullscreen';
  header?: React.ReactNode;
  onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────

const TYPE_SPEED = 15; // ms per char

// ── Hardcoded initial welcome entries (from data/darkroom-messages.json) ──

const INITIAL_ENTRIES_EN: DisplayEntry[] = [
  {
    id: 'init-1',
    timestamp: '02:33:08',
    location: 'SYSTEM',
    action: 'New signal checked in',
    message: "You're not on the regular schedule. That's fine. The system is used to outliers.",
    type: 'log',
    isTyping: true,
  },
  {
    id: 'init-2',
    timestamp: '02:33:09',
    location: '? ? ?',
    action: 'Connection established from deeper page',
    message: 'Most people stop at the front door. You kept going. That says something.',
    type: 'broadcast',
    isTyping: true,
  },
  {
    id: 'init-3',
    timestamp: '02:33:11',
    location: 'LOCAL',
    action: 'Local log updated',
    message: "There's a side entrance in this system that was left unlocked on purpose. Consider yourself logged in.",
    tags: ['DOOR: INTERNAL', 'ORIGIN: UNKNOWN', 'STATUS: OPEN'],
    type: 'log',
    isTyping: true,
  },
];

const INITIAL_ENTRIES_ZH: DisplayEntry[] = [
  {
    id: 'init-1',
    timestamp: '02:33:08',
    location: '系统',
    action: '检测到新的访问信号',
    message: '你不在常规运行时段出现。没关系，系统已经习惯了异常值。',
    type: 'log',
    isTyping: true,
  },
  {
    id: 'init-2',
    timestamp: '02:33:09',
    location: '？ ？ ？',
    action: '有节点从深层页面接入',
    message: '大多数人停在门口，你没有。这本身就说得通。',
    type: 'broadcast',
    isTyping: true,
  },
  {
    id: 'init-3',
    timestamp: '02:33:11',
    location: '本地',
    action: '本地日志已更新',
    message: '这扇侧门是故意留着的。登录已记录。',
    tags: ['门：内部', '来源：未知', '状态：开放'],
    type: 'log',
    isTyping: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────

function getNowTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ── useTypewriter hook ────────────────────────────────────────────────

function useTypewriter(text: string, speed = TYPE_SPEED, onDone?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  // Keep onDone ref fresh without restarting the interval
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    indexRef.current = 0;
    doneRef.current = false;

    if (!text) {
      setDisplayed('');
      return;
    }
    setDisplayed('');

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

// ── getEntryText ──────────────────────────────────────────────────────

function getEntryMeta(entry: DisplayEntry, isZh: boolean): string {
  if (entry.type === 'user') {
    return `[${entry.timestamp}] · ${isZh ? '用户输入' : 'USER INPUT'}`;
  }
  const location = entry.location || (isZh ? '系统' : 'SYSTEM');
  return `[${entry.timestamp}] · ${location}`;
}

function getEntryAction(entry: DisplayEntry, isZh: boolean): string | null {
  if (entry.type === 'user') return null;
  if (entry.type === 'broadcast') {
    return entry.action || (isZh ? '广播' : 'BROADCAST');
  }
  return entry.action || (isZh ? '系统消息' : 'System message');
}

function getEntryMessage(entry: DisplayEntry, isZh: boolean): string {
  if (entry.type === 'user') {
    return `> ${entry.message}`;
  }
  if (entry.type === 'broadcast') {
    return `"${entry.message}"`;
  }
  return entry.message;
}

// ── EntryItem sub-component ───────────────────────────────────────────

function EntryItem({
  entry,
  isActiveTyping,
  onDone,
  isZh,
}: {
  entry: DisplayEntry;
  isActiveTyping: boolean;
  onDone?: () => void;
  isZh: boolean;
}) {
  const message = getEntryMessage(entry, isZh);
  const typedMessage = useTypewriter(isActiveTyping ? message : '', TYPE_SPEED, onDone);
  const displayMessage = isActiveTyping ? typedMessage : message;

  const meta = getEntryMeta(entry, isZh);
  const action = getEntryAction(entry, isZh);
  const tags = entry.tags || [];

  return (
    <div className={`darkroom-log-entry ${entry.type}`}>
      <div className="darkroom-log-meta">{meta}</div>
      {action && <div className="darkroom-log-action">{`> ${action}`}</div>}
      <div className="darkroom-log-message">{displayMessage}</div>
      {tags.length > 0 && (
        <div className="darkroom-log-tags">
          {tags.map((t) => (
            <span key={t} className="darkroom-log-tag">{`[${t}]`}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SignalHeader sub-component ────────────────────────────────────────

function SignalHeader({ isZh, centered = false }: { isZh: boolean; centered?: boolean }) {
  return (
    <div className={`darkroom-chat-signal ${centered ? 'darkroom-chat-signal-center' : ''}`}>
      <span className="darkroom-chat-signal-pulse" />
      <strong>118.7 MHz</strong>
      <span className="darkroom-chat-signal-sep">·</span>
      <span className="darkroom-chat-signal-alert">{isZh ? '未追踪' : 'UNTRACED'}</span>
      <span className="darkroom-chat-signal-sep">·</span>
      <span className="darkroom-chat-signal-mode">{isZh ? '营业时间外' : 'AFTER HOURS'}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function DarkroomChat({
  mode = 'embedded',
  header,
  onBack,
  isZh = false,
  onMemoryExtracted,
  ...chatOptions
}: DarkroomChatProps) {
  const { history, loading, sendMessage } = useDarkroomChat({
    isZh,
    onMemoryExtracted,
    ...chatOptions,
  });

  // ── State ──
  // ── State ──
  const initialEntries = isZh ? INITIAL_ENTRIES_ZH : INITIAL_ENTRIES_EN;
  const [entries, setEntries] = useState<DisplayEntry[]>(initialEntries);
  const [typingQueue, setTypingQueue] = useState<string[]>(
    initialEntries.map((e) => e.id)
  );
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const historyIdCounter = useRef(0);
  const pendingTimeRef = useRef<string>('');

  // ── Intersection Observer ──
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHasEnteredViewport(true);
      },
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(terminal);
    return () => observer.disconnect();
  }, []);

  // ── Sync history changes into entries ──
  useEffect(() => {
    if (history.length === 0) return;

    const lastMessage = history[history.length - 1];
    const id = `hist-${historyIdCounter.current++}`;

    if (lastMessage.role === 'user') {
      // User messages appear instantly
      const userEntry: DisplayEntry = {
        id,
        timestamp: lastMessage.timestamp || getNowTime(),
        message: lastMessage.content,
        type: 'user',
        isTyping: false,
      };
      setEntries((prev) => [...prev, userEntry]);
    } else if (lastMessage.role === 'assistant') {
      // Assistant messages start with isTyping: true and are queued
      const assistantEntry: DisplayEntry = {
        id,
        timestamp: lastMessage.timestamp || getNowTime(),
        location: '',
        action: isZh ? '响应已接收' : 'Response received',
        message: lastMessage.content,
        type: 'system',
        isTyping: true,
      };
      setEntries((prev) => [...prev, assistantEntry]);
      setTypingQueue((prev) => [...prev, id]);
    }
  }, [history, isZh]);

  // ── Loading state tracking ──
  useEffect(() => {
    if (loading) {
      pendingTimeRef.current = getNowTime();
    }
  }, [loading]);
  // ── Typing queue management ──
  useEffect(() => {
    if (!hasEnteredViewport) return;
    if (currentTypingId === null && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue;
      setCurrentTypingId(next);
      setTypingQueue(rest);
    }
  }, [hasEnteredViewport, currentTypingId, typingQueue]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentTypingId]);

  // ── Hide site nav/footer when in fullscreen chat mode ──
  useEffect(() => {
    if (mode !== 'fullscreen') return;
    document.body.classList.add('darkroom-chat-active');
    return () => {
      document.body.classList.remove('darkroom-chat-active');
    };
  }, [mode]);

  // ── Anchor the fullscreen chat display to the visual viewport (mobile keyboard) ──
  useEffect(() => {
    if (mode !== 'fullscreen' || typeof window === 'undefined' || !window.visualViewport) return;
    const display = displayRef.current;
    if (!display) return;
    const vv = window.visualViewport;

    const isMobile = () => window.innerWidth < 1024;

    const update = () => {
      if (!isMobile()) {
        display.style.height = '';
        return;
      }
      // Fit the chat display exactly into the visible viewport so the input
      // bar stays right above the on-screen keyboard with no extra gap.
      const visibleHeight = Math.round(vv.height);
      display.style.height = `${visibleHeight}px`;
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      display.style.height = '';
    };
  }, [mode]);

  // ── Called when an entry finishes typing ──
  const handleTypingDone = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, isTyping: false } : e))
    );
    setCurrentTypingId(null);
  }, []);

  // ── Send handler ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    await sendMessage(text);

    // Blur on mobile so the keyboard closes and iOS zoom resets
    setTimeout(() => inputRef.current?.blur(), 100);
  }, [input, loading, sendMessage]);

  // ── Keyboard handler ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // ── After mobile keyboard closes, re-anchor terminal into viewport ──
  const handleInputBlur = () => {
    if (typeof window === 'undefined' || !terminalRef.current) return;
    setTimeout(() => {
      const rect = terminalRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 350);
  };

  // ── When the input is focused, scroll the latest message into view ──
  const handleInputFocus = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 250);
  };

  // ── Render helpers ──
  const rootClass =
    mode === 'embedded' ? 'darkroom-chat-embedded' : 'darkroom-chat-fullscreen';

  const screenContent = (
    <>
      {mode === 'embedded' && <SignalHeader isZh={isZh} />}

      <div className="darkroom-chat-entries">
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
                ? `[${pendingTimeRef.current}] · 等待中\n> 接收信号中……\n_`
                : `[${pendingTimeRef.current}] · PENDING\n> Receiving transmission...\n_`}
            </pre>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="darkroom-chat-input-line">
        <span className="darkroom-chat-prompt">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={isZh ? '输入指令...' : 'Enter command...'}
          disabled={loading}
          className="darkroom-chat-input"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="darkroom-chat-cursor">_</span>
      </div>
    </>
  );

  // ── Fullscreen mode ──
  if (mode === 'fullscreen') {
    return (
      <div className={rootClass} ref={terminalRef}>
        <div className="darkroom-chat-display" ref={displayRef}>
          {/* Fullscreen header */}
          <div className="darkroom-chat-header">
            {onBack && (
              <button className="darkroom-chat-back" onClick={onBack} type="button">
                {isZh ? '← 返回' : '← Back'}
              </button>
            )}
            <SignalHeader isZh={isZh} centered />
            {header}
          </div>

          <div className="darkroom-chat-screen" ref={scrollRef}>
            {screenContent}
          </div>
        </div>
      </div>
    );
  }

  // ── Embedded mode ──
  return (
    <div className={rootClass} ref={terminalRef}>
      <div className="darkroom-chat-screen" ref={scrollRef}>
        {screenContent}
      </div>
    </div>
  );
}
