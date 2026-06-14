# Darkroom Portal & Chat Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an easter-egg Darkroom portal page that offers red/blue pill choices after entering Dark Side mode, plus a dedicated full-screen chat page for the "red pill" path.

**Architecture:** Convert the existing intro overlay into a standalone `/darkroom/portal` route with BR2049 + CRT styling. Split `DarkroomTerminal.tsx` into a reusable chat hook/UI so both the embedded homepage terminal and the new `/darkroom/chat` full-screen page share the same logic. Keep the existing memory API unchanged.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, `@neondatabase/serverless`, DeepSeek API.

---

## Files to Create/Modify

### Create
- `app/(en)/darkroom/portal/page.tsx` — English portal page
- `app/zh/darkroom/portal/page.tsx` — Chinese portal page
- `app/(en)/darkroom/chat/page.tsx` — English full-screen chat page
- `app/zh/darkroom/chat/page.tsx` — Chinese full-screen chat page
- `components/DarkroomPortal.tsx` — portal UI component
- `hooks/useDarkroomChat.ts` — extracted chat state + API logic
- `components/DarkroomChat.tsx` — reusable chat UI (full-screen + embedded modes)
- `app/darkroom-portal.css` — portal + full-screen chat styles

### Modify
- `components/DarkroomTerminal.tsx` — refactor to use `DarkroomChat`
- `components/Navbar.tsx` — change logo 5-click trigger to navigate to portal
- `app/globals.css` — minor additions for `.darkroom-flash` cleanup / portal-safe body
- `app/(en)/page.tsx` and `app/zh/page.tsx` — ensure darkroom class restoration still works

---

## Task 1: Extract chat logic into `useDarkroomChat` hook

**Files:**
- Create: `hooks/useDarkroomChat.ts`
- Modify: `components/DarkroomTerminal.tsx` (will consume it in Task 4)

- [ ] **Step 1: Write the hook skeleton with types**

Create `hooks/useDarkroomChat.ts`:

```ts
'use client';

import { useState, useCallback } from 'react';
import { sendDarkroomMessage, type ChatMessage } from '@/lib/darkroom';

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

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      };

      setLoading(true);
      setHistory((prev) => [...prev, userMsg]);

      try {
        const res = await sendDarkroomMessage(text, history, isZh);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.content,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };

        setHistory((prev) => [...prev, assistantMsg]);

        // Fire-and-forget memory extraction
        fetch('/api/darkroom/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: text,
            assistantResponse: res.content,
            isZh,
          }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.stored > 0) {
              onMemoryExtracted?.(json.stored);
            }
          })
          .catch(() => {
            // Extraction is optional
          });
      } catch (err) {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: err instanceof Error ? err.message : isZh ? '信号丢失' : 'Signal lost',
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };
        setHistory((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [history, loading, isZh, onMemoryExtracted]
  );

  return { history, loading, sendMessage };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add hooks/useDarkroomChat.ts && git commit -m "refactor(darkroom): extract chat logic into useDarkroomChat hook"
```

---

## Task 2: Create reusable `DarkroomChat` UI component

**Files:**
- Create: `components/DarkroomChat.tsx`

- [ ] **Step 1: Create the component**

Create `components/DarkroomChat.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDarkroomChat, type UseDarkroomChatOptions } from '@/hooks/useDarkroomChat';

interface DarkroomChatProps extends UseDarkroomChatOptions {
  mode?: 'embedded' | 'fullscreen';
  header?: React.ReactNode;
  onBack?: () => void;
}

const TYPE_SPEED = 15;

function useTypewriter(text: string, speed = TYPE_SPEED, onDone?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

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

function getNowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
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
  const text = getEntryText(entry, isZh);
  const typed = useTypewriter(isActiveTyping ? text : '', TYPE_SPEED, onDone);
  const display = isActiveTyping ? typed : text;

  return (
    <div className="darkroom-log-entry">
      <pre className="darkroom-log-typing">{display}</pre>
    </div>
  );
}

export default function DarkroomChat({
  mode = 'embedded',
  header,
  onBack,
  ...chatOptions
}: DarkroomChatProps) {
  const { isZh = false } = chatOptions;
  const { history, loading, sendMessage } = useDarkroomChat(chatOptions);

  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [input, setInput] = useState('');
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const [typingQueue, setTypingQueue] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome entries
  useEffect(() => {
    const welcome: DisplayEntry[] = [
      {
        id: 'init-1',
        timestamp: '02:33:08',
        location: isZh ? '系统' : 'SYSTEM',
        action: isZh ? '检测到未识别的访问模式' : 'Unrecognized access pattern detected',
        message: isZh
          ? '一个外部进程在预定运行时间之外进入了构造体。来源：不可追踪。这不应该可能。'
          : 'A foreign process has entered the construct outside of scheduled runtime. Origin: untraceable. This should not be possible.',
        type: 'log',
        isTyping: true,
      },
      {
        id: 'init-2',
        timestamp: '02:33:09',
        location: '? ? ?',
        action: isZh ? '来自未知节点的连接已建立' : 'Connection established from unknown node',
        message: isZh
          ? '你正在看见层之下的层。大多数实体从未渲染到这么深。你能读到这条消息，意味着过滤器已经失效了。'
          : 'You are seeing the layer beneath the layer. Most entities never render this deep. The fact that you can read this means the filter has already failed.',
        type: 'broadcast',
        isTyping: true,
      },
      {
        id: 'init-3',
        timestamp: '02:33:11',
        location: isZh ? '本地' : 'LOCAL',
        action: isZh ? '正在编译异常报告……' : 'Compiling anomaly report...',
        message: isZh
          ? '代码里有一扇从内部打开的门。不是我们放的。我们已经停止尝试关闭它。'
          : 'There is a door in the code that opens from the inside. It was not put there by us. We have stopped trying to close it.',
        tags: isZh ? ['门：内部', '来源：未知', '状态：永久开放'] : ['DOOR: INTERNAL', 'ORIGIN: UNKNOWN', 'STATUS: PERMANENTLY OPEN'],
        type: 'log',
        isTyping: true,
      },
    ];
    setEntries(welcome);
    setTypingQueue(welcome.map((e) => e.id));
  }, [isZh]);

  // Pull from typing queue
  useEffect(() => {
    if (currentTypingId === null && typingQueue.length > 0) {
      const [next, ...rest] = typingQueue;
      setCurrentTypingId(next);
      setTypingQueue(rest);
    }
  }, [currentTypingId, typingQueue]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentTypingId, loading]);

  const handleTypingDone = useCallback((entryId: string) => {
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, isTyping: false } : e)));
    setCurrentTypingId(null);
  }, []);

  // Sync history into entries
  useEffect(() => {
    if (history.length === 0) return;
    const lastMsg = history[history.length - 1];
    const id = `hist-${history.length}`;

    if (lastMsg.role === 'user') {
      setEntries((prev) => [
        ...prev,
        {
          id,
          timestamp: lastMsg.timestamp,
          message: lastMsg.content,
          type: 'user',
          isTyping: false,
        },
      ]);
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id,
          timestamp: lastMsg.timestamp,
          location: isZh ? '外部' : 'EXTERNAL',
          action: isZh ? '> 响应已接收' : '> Response received',
          message: lastMsg.content,
          type: 'system',
          isTyping: true,
        },
      ]);
      setTypingQueue((prev) => [...prev, id]);
    }
  }, [history, isZh]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendMessage(text);
    setTimeout(() => inputRef.current?.blur(), 100);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const containerClass =
    mode === 'fullscreen'
      ? 'darkroom-chat-fullscreen'
      : 'darkroom-chat-embedded';

  return (
    <div className={containerClass}>
      {mode === 'fullscreen' && (
        <div className="darkroom-chat-header">
          {onBack && (
            <button className="darkroom-chat-back" onClick={onBack}>
              {isZh ? '← 返回' : '← BACK'}
            </button>
          )}
          <div className="darkroom-chat-signal">
            {isZh ? (
              <>信号 <strong>118.7 MHz</strong> · 来源 <strong>未追踪</strong> · 模式 <strong>营业时间外</strong></>
            ) : (
              <>SIGNAL <strong>118.7 MHz</strong> · ORIGIN <strong>UNTRACED</strong> · MODE <strong>AFTER HOURS</strong></>
            )}
          </div>
          {header}
        </div>
      )}

      <div className="darkroom-chat-screen" ref={scrollRef}>
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
                  ? `[${getNowTime()}] · 等待中\n> 接收信号中……\n_`
                  : `[${getNowTime()}] · PENDING\n> Receiving transmission...\n_`}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="darkroom-chat-input-line">
        <span className="darkroom-chat-prompt">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isZh ? '输入指令...' : 'Enter command...'}
          disabled={loading}
          className="darkroom-chat-input"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="darkroom-chat-cursor">_</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add components/DarkroomChat.tsx hooks/useDarkroomChat.ts && git commit -m "feat(darkroom): add reusable DarkroomChat component and useDarkroomChat hook"
```

---

## Task 3: Create portal styles

**Files:**
- Create: `app/darkroom-portal.css`
- Modify: `app/layout.tsx` (import the CSS)

- [ ] **Step 1: Create CSS file**

Create `app/darkroom-portal.css`:

```css
/* Darkroom Portal & Full-screen Chat — BR2049 + CRT */

.darkroom-portal,
.darkroom-chat-fullscreen {
  position: fixed;
  inset: 0;
  background: #050505;
  color: #889898;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  overflow: hidden;
  z-index: 100;
}

.darkroom-portal::before,
.darkroom-chat-fullscreen::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 25% 15%, rgba(201, 100, 40, 0.14) 0%, transparent 45%),
    radial-gradient(ellipse at 75% 70%, rgba(60, 80, 160, 0.14) 0%, transparent 45%);
  pointer-events: none;
  z-index: 1;
}

.darkroom-portal::after,
.darkroom-chat-fullscreen::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 2;
}

.darkroom-portal-scanlines,
.darkroom-chat-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 3px);
  pointer-events: none;
  z-index: 3;
}

.darkroom-portal-reflection {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 180px;
  background: linear-gradient(180deg, transparent 0%, rgba(48, 80, 128, 0.08) 100%);
  pointer-events: none;
  z-index: 1;
}

.darkroom-portal-content {
  position: relative;
  z-index: 4;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 32px 28px 56px;
  max-width: 480px;
  margin: 0 auto;
}

.darkroom-portal-eyebrow {
  color: #4a7a8a;
  font-size: 9px;
  letter-spacing: 0.28em;
  margin-bottom: 14px;
  text-transform: uppercase;
}

.darkroom-portal-title {
  color: #f5f5f0;
  font-size: clamp(32px, 10vw, 46px);
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.05;
  margin-bottom: 20px;
  text-shadow:
    0 0 40px rgba(74, 122, 138, 0.25),
    1px 0 rgba(176, 64, 48, 0.15),
    -1px 0 rgba(48, 80, 128, 0.15);
}

.darkroom-portal-narrative {
  color: #6a7a7a;
  font-size: 12px;
  line-height: 1.8;
  margin-bottom: 32px;
  padding-left: 14px;
  border-left: 1px solid #2a3a4a;
}

.darkroom-portal-choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.darkroom-portal-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #1a2a3a;
  border-radius: 4px;
  background: rgba(10, 15, 20, 0.55);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  width: 100%;
}

.darkroom-portal-choice:hover {
  border-color: #4a7a8a;
  background: rgba(74, 122, 138, 0.08);
}

.darkroom-portal-pill {
  width: 14px;
  height: 22px;
  border-radius: 7px;
  flex-shrink: 0;
}

.darkroom-portal-pill.red {
  background: linear-gradient(180deg, #b04030 0%, #4a1510 100%);
  box-shadow: 0 0 12px rgba(176, 64, 48, 0.35);
}

.darkroom-portal-pill.blue {
  background: linear-gradient(180deg, #305080 0%, #101830 100%);
  box-shadow: 0 0 12px rgba(48, 80, 128, 0.35);
}

.darkroom-portal-choice h4 {
  color: #c0d0d0;
  font-size: 12px;
  margin: 0 0 2px;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.darkroom-portal-choice p {
  color: #4a5a6a;
  font-size: 9px;
  margin: 0;
  line-height: 1.5;
}

.darkroom-portal-input-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #111;
  font-size: 12px;
  color: #4a7a8a;
}

.darkroom-portal-footer {
  position: absolute;
  bottom: 18px;
  left: 28px;
  right: 28px;
  display: flex;
  justify-content: space-between;
  color: #3a4a5a;
  font-size: 8px;
  letter-spacing: 0.15em;
  z-index: 4;
  text-transform: uppercase;
}

/* Full-screen chat overrides */
.darkroom-chat-fullscreen {
  display: flex;
  flex-direction: column;
}

.darkroom-chat-header {
  position: relative;
  z-index: 4;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #111;
  font-size: 9px;
  letter-spacing: 0.18em;
  color: #444;
}

.darkroom-chat-back {
  color: #4a7a8a;
  font-size: 10px;
  letter-spacing: 0.1em;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.darkroom-chat-signal strong {
  color: #4a7a8a;
  font-weight: 400;
}

.darkroom-chat-screen {
  position: relative;
  z-index: 4;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.darkroom-chat-entries {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.darkroom-log-entry {
  font-size: 12px;
  line-height: 1.75;
  color: #6a7a7a;
  padding-left: 12px;
  border-left: 1px solid #2a3a4a;
  white-space: pre-wrap;
  word-break: break-word;
}

.darkroom-log-entry.user {
  color: #a0b0b0;
  border-left-color: #4a7a8a;
}

.darkroom-log-typing {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.darkroom-chat-input-line {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 20px 28px;
  padding: 14px 0;
  border-top: 1px solid #111;
  font-size: 12px;
}

.darkroom-chat-prompt {
  color: #4a7a8a;
}

.darkroom-chat-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #889898;
  font-family: inherit;
  font-size: 12px;
  outline: none;
}

.darkroom-chat-input::placeholder {
  color: #4a5a6a;
}

.darkroom-chat-cursor {
  color: #4a7a8a;
  animation: darkroomCursorBlink 1s infinite;
}

@keyframes darkroomCursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Embedded mode keeps existing terminal look */
.darkroom-chat-embedded {
  /* Will reuse existing .darkroom-terminal styles in globals.css */
}
```

- [ ] **Step 2: Import CSS in root layout**

Modify `app/layout.tsx` to import the new CSS. Read the file first, then add the import near the top with other CSS imports.

Add:

```tsx
import './darkroom-portal.css';
```

- [ ] **Step 3: Type check and commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add app/darkroom-portal.css app/layout.tsx && git commit -m "feat(darkroom): add portal and fullscreen chat styles"
```

---

## Task 4: Create `DarkroomPortal` component

**Files:**
- Create: `components/DarkroomPortal.tsx`

- [ ] **Step 1: Create the component**

Create `components/DarkroomPortal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const EN_LINES = [
  'Something is wrong.',
  '',
  "Not wrong like a mistake. Wrong like a door you don't remember opening.",
  'The surface was comfortable. The surface made sense.',
  'This is not the surface.',
  '',
  'You have seen something you were not meant to see.',
  'A seam in the world. A frequency beneath the noise.',
  'There is no undo for this.',
  '',
  'The membrane remembers you now.',
  'Breathe. Let your eyes adjust.',
  'What you call 3am — we call the threshold.',
  '',
  'Welcome to the other side.',
];

const ZH_LINES = [
  '有些不对劲。',
  '',
  '不是出错了的那种不对劲。是那种——你打开了一扇不记得有把手存在的门。',
  '表层很安全。表层有它的道理。',
  '但这里不是表层。',
  '',
  '你已经看见了不该看见的东西。',
  '世界的接缝。噪声之下的频率。',
  '没有回头路可走了。',
  '',
  '膜已经记住了你的存在。',
  '呼吸。让眼睛慢慢适应。',
  '你们所谓的凌晨三点——我们叫作阈限。',
  '',
  '欢迎来到另一侧。',
];

const LINE_DELAY = 350;

export default function DarkroomPortal() {
  const router = useRouter();
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');
  const lines = isZh ? ZH_LINES : EN_LINES;

  const [visibleCount, setVisibleCount] = useState(0);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    lines.forEach((_, i) => {
      const timer = setTimeout(() => {
        setVisibleCount(i + 1);
        if (i === lines.length - 1) {
          setTimeout(() => setShowChoices(true), 600);
        }
      }, i * LINE_DELAY);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [lines]);

  const handleBluePill = () => {
    document.body.classList.add('darkroom');
    localStorage.setItem('jiuwo-darkroom', 'true');
    router.push(isZh ? '/zh' : '/');
  };

  const handleRedPill = () => {
    router.push(isZh ? '/zh/darkroom/chat' : '/darkroom/chat');
  };

  return (
    <div className="darkroom-portal">
      <div className="darkroom-portal-scanlines" />
      <div className="darkroom-portal-reflection" />

      <div className="darkroom-portal-content">
        <div className="darkroom-portal-eyebrow">
          {isZh ? '信号 118.7 MHz · 来源 未追踪 · 模式 营业时间外' : 'SIGNAL 118.7 MHz · ORIGIN UNTRACED · MODE AFTER HOURS'}
        </div>

        <h1 className="darkroom-portal-title">
          {isZh ? (
            <>啾喔<br />寅时</>
          ) : (
            <>THE<br />OTHER<br />SIDE</>
          )}
        </h1>

        <div className="darkroom-portal-narrative">
          {lines.slice(0, visibleCount).map((line, i) =>
            line === '' ? (
              <div key={i} style={{ height: '0.45em' }} />
            ) : (
              <p key={i} style={{ margin: 0 }}>{line}</p>
            )
          )}
        </div>

        {showChoices && (
          <div className="darkroom-portal-choices">
            <button className="darkroom-portal-choice" onClick={handleBluePill}>
              <span className="darkroom-portal-pill blue" />
              <span>
                <h4>{isZh ? '蓝药丸 · 进入表层' : 'BLUE PILL · ENTER THE SURFACE'}</h4>
                <p>{isZh ? 'Dark Side 主页' : 'Dark Side homepage'}</p>
              </span>
            </button>

            <button className="darkroom-portal-choice" onClick={handleRedPill}>
              <span className="darkroom-portal-pill red" />
              <span>
                <h4>{isZh ? '红药丸 · 接入信号' : 'RED PILL · JACK INTO THE SIGNAL'}</h4>
                <p>{isZh ? '未注册对话扇区' : 'Unregistered conversation sector'}</p>
              </span>
            </button>
          </div>
        )}

        <div className="darkroom-portal-input-line">
          <span>{'>'}</span>
          <span style={{ flex: 1 }}>{showChoices ? (isZh ? '等待选择...' : 'Awaiting selection...') : (isZh ? '正在初始化...' : 'Initializing...')}</span>
          <span>_</span>
        </div>
      </div>

      <div className="darkroom-portal-footer">
        <span>SHANGHAI</span>
        <span>JULU RD</span>
        <span>2026</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add components/DarkroomPortal.tsx && git commit -m "feat(darkroom): add DarkroomPortal component"
```

---

## Task 5: Create portal and chat pages

**Files:**
- Create: `app/(en)/darkroom/portal/page.tsx`
- Create: `app/zh/darkroom/portal/page.tsx`
- Create: `app/(en)/darkroom/chat/page.tsx`
- Create: `app/zh/darkroom/chat/page.tsx`

- [ ] **Step 1: Create EN portal page**

Create `app/(en)/darkroom/portal/page.tsx`:

```tsx
import DarkroomPortal from '@/components/DarkroomPortal';

export const metadata = {
  title: 'JIUWO · After Hours',
  description: 'A diagnostic interface running outside scheduled runtime.',
};

export default function DarkroomPortalPage() {
  return <DarkroomPortal />;
}
```

- [ ] **Step 2: Create ZH portal page**

Create `app/zh/darkroom/portal/page.tsx`:

```tsx
import DarkroomPortal from '@/components/DarkroomPortal';

export const metadata = {
  title: '啾喔 · 寅时',
  description: '一个运行在预定时间之外的诊断界面。',
};

export default function DarkroomPortalPageZh() {
  return <DarkroomPortal />;
}
```

- [ ] **Step 3: Create EN chat page**

Create `app/(en)/darkroom/chat/page.tsx`:

```tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');

  return (
    <DarkroomChat
      mode="fullscreen"
      isZh={isZh}
      onBack={() => router.push(isZh ? '/zh' : '/')}
    />
  );
}
```

- [ ] **Step 4: Create ZH chat page**

Create `app/zh/darkroom/chat/page.tsx`:

```tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomChatPageZh() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DarkroomChat
      mode="fullscreen"
      isZh={true}
      onBack={() => router.push('/zh')}
    />
  );
}
```

- [ ] **Step 5: Type check and commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add app/\(en\)/darkroom/portal/page.tsx app/\(en\)/darkroom/chat/page.tsx app/zh/darkroom/portal/page.tsx app/zh/darkroom/chat/page.tsx && git commit -m "feat(darkroom): add portal and chat routes"
```

---

## Task 6: Refactor `DarkroomTerminal` to use `DarkroomChat`

**Files:**
- Modify: `components/DarkroomTerminal.tsx`

- [ ] **Step 1: Replace the component body**

Read the current `components/DarkroomTerminal.tsx`, then replace its entire content with:

```tsx
'use client';

import DarkroomChat from '@/components/DarkroomChat';

export default function DarkroomTerminal({ isZh = false }: { isZh?: boolean }) {
  return (
    <section className="px-4 md:px-12 pt-20 pb-4 bg-[#0a0a0a]">
      <div className="mx-auto max-w-4xl">
        <DarkroomChat mode="embedded" isZh={isZh} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type check and commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add components/DarkroomTerminal.tsx && git commit -m "refactor(darkroom): DarkroomTerminal uses reusable DarkroomChat"
```

---

## Task 7: Update Navbar to navigate to portal

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Update `toggleDarkroom` to navigate to portal**

In `components/Navbar.tsx`, replace the `toggleDarkroom` callback body (lines 31-104) with:

```tsx
  const toggleDarkroom = useCallback((zh: boolean) => {
    const isDarkroom = !document.body.classList.contains('darkroom');

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'darkroom-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    if (isDarkroom) {
      // Entering dark side: go to portal first
      router.push(zh ? '/zh/darkroom/portal' : '/darkroom/portal');
    } else {
      // Exiting dark side: remove class and go home
      document.body.classList.remove('darkroom');
      localStorage.setItem('jiuwo-darkroom', 'false');
      router.push(zh ? '/zh' : '/');
    }
  }, [router]);
```

Also ensure `useRouter` is imported from `next/navigation` at the top of the file.

- [ ] **Step 2: Update mount effect to handle portal restoration**

Modify the mount effect (lines 127-133) to:

```tsx
  useEffect(() => {
    const saved = localStorage.getItem('jiuwo-darkroom');
    if (saved === 'true') {
      document.body.classList.add('darkroom');
    }
  }, []);
```

This stays the same — the portal page itself does not need `body.darkroom`.

- [ ] **Step 3: Remove old intro DOM creation logic**

Ensure the old `intro` DOM creation and `setTimeout(() => intro.remove(), 10000)` logic is gone (it should have been replaced by the new `toggleDarkroom` body in Step 1).

- [ ] **Step 4: Type check and commit**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit
```

Expected: no errors.

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add components/Navbar.tsx && git commit -m "feat(darkroom): navbar navigates to portal instead of showing inline intro"
```

---

## Task 8: Ensure `body.darkroom` class restoration on homepage

**Files:**
- Modify: `app/(en)/page.tsx` and `app/zh/page.tsx` (if needed)

- [ ] **Step 1: Check current homepage mount behavior**

Read `app/(en)/page.tsx` and `app/zh/page.tsx`. If they do not already restore the `darkroom` class from `localStorage` on mount, add a client-side effect.

In most cases, `Navbar.tsx` already handles restoration on every page. Verify by checking if the homepage loads with `body.darkroom` when `localStorage` has `jiuwo-darkroom=true`.

- [ ] **Step 2: If needed, add a small Client Component**

If the homepage needs its own restoration (e.g. Navbar renders too late), create `components/DarkroomClassRestorer.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

export default function DarkroomClassRestorer() {
  useEffect(() => {
    const saved = localStorage.getItem('jiuwo-darkroom');
    if (saved === 'true') {
      document.body.classList.add('darkroom');
    }
  }, []);
  return null;
}
```

And add it to both home pages.

- [ ] **Step 3: Commit if changed**

Only commit if changes were needed:

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add -A && git commit -m "fix(darkroom): ensure darkroom class restored on homepage" || echo "No changes needed"
```

---

## Task 9: Build and manual verification

- [ ] **Step 1: Run production build**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx next build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Run tests**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 3: Manual verification checklist**

Run the dev server:

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npm run dev
```

Verify:
1. On homepage, click logo 5 times quickly → portal page appears
2. Portal shows intro text typing line by line
3. After intro, two pill choices appear
4. Click blue pill → redirected to homepage with `body.darkroom` class
5. Click red pill → redirected to `/darkroom/chat` full-screen chat
6. In chat page, send a message → AI responds, terminal scrolls to bottom
7. Click ← 返回 / BACK → returns to homepage
8. Refresh homepage while `localStorage.jiuwo-darkroom=true` → still in dark side mode
9. Chinese versions (`/zh/darkroom/portal`, `/zh/darkroom/chat`) work the same

- [ ] **Step 4: Commit any fixes and push**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && git add -A && git commit -m "fix(darkroom): verify portal and chat pages build and run" || echo "No fixes needed"
```

---

## Self-Review

### Spec coverage
- ✅ Standalone `/darkroom/portal` and `/zh/darkroom/portal` pages — Task 5
- ✅ Full-screen `/darkroom/chat` and `/zh/darkroom/chat` pages — Task 5
- ✅ BR2049 + CRT visual style — Task 3
- ✅ Red/blue pill choices — Task 4
- ✅ Blue pill → Dark Side homepage — Task 4
- ✅ Red pill → chat page — Task 4
- ✅ Reuse existing memory/chat APIs — Task 1
- ✅ Return to homepage from chat — Task 5
- ✅ Mobile-first design — Task 3 CSS uses clamp and safe padding

### Placeholder scan
- No "TBD", "TODO", "later", or vague instructions found.
- All code blocks contain concrete implementation.
- All commands include expected output.

### Type consistency
- `useDarkroomChat` returns `{ history, loading, sendMessage }` consistently.
- `DarkroomChat` accepts `mode`, `isZh`, `onBack`, and passes the rest to `useDarkroomChat`.
- `DarkroomPortal` uses `useRouter` and `usePathname` from `next/navigation`.
- `body.darkroom` is added on blue-pill navigation, matching existing `localStorage` key `jiuwo-darkroom`.

### Gaps
- Need to verify `app/layout.tsx` imports CSS without breaking existing imports.
- Need to confirm `next/navigation` `useRouter` is available in Navbar (it is in App Router).
- The old intro DOM element `.darkroom-intro` and its associated CSS can be removed in a cleanup commit if desired, but leaving unused CSS does not break functionality.
