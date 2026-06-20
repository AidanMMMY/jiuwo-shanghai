# Darkroom Admin Session-Aggregated Conversations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改造 `/admin/darkroom` 的 Recent Conversations 区域，按 session 聚合对话，显示首/末消息时间，支持排序与展开/收起。

**Architecture:** 服务端新增 `getRecentConversationsGroupedBySession()` 做 JOIN 聚合；admin page 保持 Server Component 并调用新函数；新增客户端组件 `RecentConversationList.tsx` 负责排序状态、展开状态和渲染。所有交互在浏览器内完成。

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, @neondatabase/serverless, Vitest（本项目无 admin 页面单元测试，以类型检查和构建验证为主）。

---

## File Structure

| File | Responsibility |
|---|---|
| `/lib/darkroom-memory.ts` | 新增 `SessionConversationGroup` 类型与 `getRecentConversationsGroupedBySession()` 查询函数。 |
| `/app/admin/darkroom/page.tsx` | 将 `getRecentConversations(20)` 替换为 `getRecentConversationsGroupedBySession()`，并传入新的客户端组件。 |
| `/components/darkroom/RecentConversationList.tsx` | 新建客户端组件：排序按钮组、session 卡片、展开/收起、单条消息渲染。 |

---

## Task 1: Add session-grouped query in `lib/darkroom-memory.ts`

**Files:**
- Modify: `/lib/darkroom-memory.ts`

- [ ] **Step 1: Add `SessionConversationGroup` interface**

在 `/lib/darkroom-memory.ts` 中，紧跟 `Conversation` 接口后新增：

```ts
export interface SessionConversationGroup {
  sessionId: string;
  summary: string;
  firstMessageAt: string;
  lastMessageAt: string;
  conversations: Conversation[];
}
```

- [ ] **Step 2: Add `getRecentConversationsGroupedBySession()`**

在 `getRecentConversations()` 附近新增函数。使用两次查询以兼容 @neondatabase/serverless 的返回结构，避免依赖 `JSON_BUILD_OBJECT` 解析：

```ts
export async function getRecentConversationsGroupedBySession(): Promise<SessionConversationGroup[]> {
  await ensureConversationsTable();
  const sql = getSql();

  // 1. Get all sessions with their first/last message times
  const sessionResult = await sql`
    SELECT
      c.session_id,
      COALESCE(MAX(s.summary), '') AS summary,
      MIN(c.created_at) AS first_message_at,
      MAX(c.created_at) AS last_message_at
    FROM darkroom_conversations c
    LEFT JOIN darkroom_sessions s ON c.session_id = s.session_id
    GROUP BY c.session_id
    ORDER BY MAX(c.created_at) DESC
  `;

  if (sessionResult.rows.length === 0) {
    return [];
  }

  // 2. Get all conversations for these sessions in one query
  const sessionIds = sessionResult.rows
    .map((row) => row.session_id)
    .filter((id): id is string => id !== null && id !== undefined);

  const convResult = await sql`
    SELECT id, user_message, assistant_response, source_lang, processed_for_memory, session_id, created_at
    FROM darkroom_conversations
    WHERE session_id IN (${sessionIds})
    ORDER BY created_at ASC
  `;

  const conversationsBySession = new Map<string, Conversation[]>();
  for (const conv of convResult.rows as Conversation[]) {
    const sid = conv.session_id ?? "unassigned";
    if (!conversationsBySession.has(sid)) {
      conversationsBySession.set(sid, []);
    }
    conversationsBySession.get(sid)!.push(conv);
  }

  return sessionResult.rows.map((row) => {
    const sid = row.session_id ?? "unassigned";
    const summary = (row.summary as string) || shortenSessionId(sid);
    return {
      sessionId: sid,
      summary,
      firstMessageAt: (row.first_message_at as string) ?? new Date(0).toISOString(),
      lastMessageAt: (row.last_message_at as string) ?? new Date(0).toISOString(),
      conversations: conversationsBySession.get(sid) ?? [],
    };
  });
}
```

- [ ] **Step 3: Add `shortenSessionId()` helper**

在 `getRecentConversationsGroupedBySession()` 上方新增：

```ts
function shortenSessionId(sessionId: string): string {
  if (sessionId.length <= 16) return sessionId;
  return `${sessionId.slice(0, 12)}…${sessionId.slice(-4)}`;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/darkroom-memory.ts
git commit -m "feat(darkroom): add getRecentConversationsGroupedBySession query"
```

---

## Task 2: Update `/app/admin/darkroom/page.tsx`

**Files:**
- Modify: `/app/admin/darkroom/page.tsx`

- [ ] **Step 1: Update imports**

将：

```ts
import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversations,
} from "@/lib/darkroom-memory";
```

改为：

```ts
import {
  getMemoryStats,
  getRecentMemories,
  getConversationStats,
  getRecentConversationsGroupedBySession,
} from "@/lib/darkroom-memory";
import { RecentConversationList } from "@/components/darkroom/RecentConversationList";
```

- [ ] **Step 2: Update data fetch**

将 `Promise.all` 中的：

```ts
getRecentConversations(20),
```

改为：

```ts
getRecentConversationsGroupedBySession(),
```

- [ ] **Step 3: Update destructuring**

将：

```ts
const [memoryStats, recentMemories, conversationStats, recentConversations] =
```

改为：

```ts
const [memoryStats, recentMemories, conversationStats, recentConversationGroups] =
```

- [ ] **Step 4: Replace Recent Conversations section**

将当前 `{
/* Recent conversations */}` 到 `</section>` 的整块代码替换为：

```tsx
        {/* Recent conversations */}
        <section className="border border-[#c9a22733] p-5">
          <RecentConversationList groups={recentConversationGroups} />
        </section>
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/darkroom/page.tsx
git commit -m "feat(darkroom): wire grouped conversations into admin page"
```

---

## Task 3: Create `/components/darkroom/RecentConversationList.tsx`

**Files:**
- Create: `/components/darkroom/RecentConversationList.tsx`

- [ ] **Step 1: Create component file with full implementation**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { SessionConversationGroup, Conversation } from "@/lib/darkroom-memory";

type SortField = "firstMessageAt" | "lastMessageAt";
type SortOrder = "asc" | "desc";

interface SortState {
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS: { label: string; value: SortState }[] = [
  { label: "最早开始 ↑", value: { field: "firstMessageAt", order: "asc" } },
  { label: "最近开始 ↓", value: { field: "firstMessageAt", order: "desc" } },
  { label: "最早活跃 ↑", value: { field: "lastMessageAt", order: "asc" } },
  { label: "最近活跃 ↓", value: { field: "lastMessageAt", order: "desc" } },
];

interface RecentConversationListProps {
  groups: SessionConversationGroup[];
}

export function RecentConversationList({ groups }: RecentConversationListProps) {
  const [sort, setSort] = useState<SortState>({ field: "lastMessageAt", order: "desc" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aTime = new Date(a[sort.field]).getTime();
      const bTime = new Date(b[sort.field]).getTime();
      return sort.order === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [groups, sort]);

  const toggleExpanded = (sessionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <h2 className="text-sm uppercase tracking-wider text-[#c9a227]">
          Recent Conversations
        </h2>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => {
            const active =
              sort.field === option.value.field && sort.order === option.value.order;
            return (
              <button
                key={option.label}
                onClick={() => setSort(option.value)}
                className={`text-xs px-2 py-1 border transition-colors ${
                  active
                    ? "bg-[#c9a227] text-[#0a0a0a] border-[#c9a227]"
                    : "text-[#a0a0a0] border-[#c9a22733] hover:border-[#c9a227]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <p className="text-[#a0a0a0] text-sm">No recent conversations.</p>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <SessionCard
              key={group.sessionId}
              group={group}
              expanded={expanded.has(group.sessionId)}
              onToggle={() => toggleExpanded(group.sessionId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface SessionCardProps {
  group: SessionConversationGroup;
  expanded: boolean;
  onToggle: () => void;
}

function SessionCard({ group, expanded, onToggle }: SessionCardProps) {
  return (
    <div className="border-b border-[#222] last:border-0 pb-4 last:pb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#c9a227] text-xs w-3 shrink-0">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="text-sm text-[#f5f5f0] truncate group-hover:text-[#c9a227] transition-colors">
            {group.summary}
          </span>
        </div>
        <div className="text-xs text-[#666] shrink-0 hidden sm:block">
          首 {formatTime(group.firstMessageAt)} · 末 {formatTime(group.lastMessageAt)}
        </div>
      </button>

      <div className="text-xs text-[#666] mt-1 mb-2 sm:hidden pl-6">
        首 {formatTime(group.firstMessageAt)} · 末 {formatTime(group.lastMessageAt)}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pl-6">
          {group.conversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
}

function ConversationItem({ conversation }: ConversationItemProps) {
  return (
    <div className="border-l-2 border-[#c9a22733] pl-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-[#666]">
          {formatTime(conversation.created_at)}
        </span>
        {!conversation.processed_for_memory && (
          <span className="text-xs px-2 py-0.5 bg-[#c9a227] text-[#0a0a0a]">
            unprocessed
          </span>
        )}
      </div>
      <p className="text-[#f5f5f0] text-sm mb-1">
        <span className="text-[#c9a227]">User:</span> {conversation.user_message}
      </p>
      <p className="text-[#a0a0a0] text-sm">
        <span className="text-[#c9a227]">AI:</span> {conversation.assistant_response}
      </p>
    </div>
  );
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

- [ ] **Step 2: Ensure `components/darkroom/` directory exists**

```bash
mkdir -p components/darkroom
```

（如果目录已存在则跳过。）

- [ ] **Step 3: Commit**

```bash
git add components/darkroom/RecentConversationList.tsx
git commit -m "feat(darkroom): add RecentConversationList client component"
```

---

## Task 4: Type-check and build

**Files:**
- Verify: `/lib/darkroom-memory.ts`
- Verify: `/app/admin/darkroom/page.tsx`
- Verify: `/components/darkroom/RecentConversationList.tsx`

- [ ] **Step 1: Run TypeScript type check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Build the app**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit any auto-fixes**

如果有 prettier/lint 自动修复，提交：

```bash
git add -A
git commit -m "chore(darkroom): format admin conversation changes"
```

---

## Task 5: Manual verification

**Files:**
- Verify: `/admin/darkroom?token=...`

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open admin page**

访问 `http://localhost:3000/admin/darkroom?token=<DARKROOM_ADMIN_TOKEN>`。

- [ ] **Step 3: Verify grouping**

确认同一个 session 的多条消息被聚合到一个可展开卡片下。

- [ ] **Step 4: Verify title display**

确认标题显示 `darkroom_sessions.summary`；summary 为空时显示缩短的 session_id。

- [ ] **Step 5: Verify first/last times**

确认标题右侧显示「首 ... · 末 ...」，时间格式为 `MM/DD HH:mm`。

- [ ] **Step 6: Verify sorting**

依次点击 4 个排序按钮，确认 session 顺序按预期变化。

- [ ] **Step 7: Verify expand/collapse**

- 页面默认所有 session 收起。
- 点击标题展开，显示该 session 下所有消息。
- 再次点击收起。

- [ ] **Step 8: Verify message items**

展开后确认每条消息显示：时间、`unprocessed` 标记（如未处理）、User 消息、AI 消息。不显示 ID 和语言标签。

- [ ] **Step 9: Verify empty/unassigned edge cases**

如果存在无 `session_id` 的消息，确认归入 `Unassigned` session。

- [ ] **Step 10: Stop dev server**

按 `Ctrl+C` 停止。

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Implementing Task |
|---|---|
| 按 session 聚合对话 | Task 1, Task 2 |
| 显示第一条/最后一条消息时间 | Task 1, Task 3 |
| 支持按两个时间正序/倒序排列 | Task 3 |
| 点击 session 标题展开/收起 | Task 3 |
| 默认按最后一条时间倒序、默认收起 | Task 3 |
| 展开后保留时间 + unprocessed 标记，去掉 ID/语言 | Task 3 |
| 取所有 session，summary 为空回退缩短 session_id | Task 1, Task 3 |
| 暗色主题/不引入新颜色 | Task 3 |
| 不影响正常模式 | 仅修改 `/admin/darkroom` 相关文件 |

### Placeholder Scan

- 无 `TBD`、`TODO`、未完整代码块或模糊步骤。

### Type Consistency

- `SessionConversationGroup` 属性名一致：`sessionId`、`summary`、`firstMessageAt`、`lastMessageAt`、`conversations`。
- `SortField` / `SortOrder` 在 Task 3 中一致使用。
- `Conversation` 接口未改动，继续沿用现有定义。

## Out of Scope Reminder

- 不修改 Darkroom 正常聊天 UI。
- 不新增持久化排序偏好。
- 不新增搜索/过滤。
- 不修改数据库表结构。
