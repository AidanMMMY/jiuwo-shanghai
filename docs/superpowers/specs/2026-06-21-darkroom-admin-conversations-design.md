# Darkroom Admin: Session-Aggregated Recent Conversations

## Summary

改造 `/admin/darkroom` 页面的 **Recent Conversations** 区域：从平铺单条对话改为按 `session_id` 聚合，显示每个 session 的摘要标题、第一条/最后一条消息时间，支持按这两个时间正序/倒序排列，并支持点击 session 标题展开/收起查看具体对话。

## Motivation

当前 Recent Conversations 平铺列出最近 20 条消息，同一个 session 的多轮对话会被打散，admin 难以快速看出「谁最近还在聊」「某次对话从什么时候开始、什么时候结束」。聚合后更符合 admin 的观察视角。

## Design Decisions

### 1. 数据模型

新增类型 `SessionConversationGroup`：

```ts
export interface SessionConversationGroup {
  sessionId: string;
  summary: string;            // sessions.summary，为空时回退到缩短的 sessionId
  firstMessageAt: string;     // ISO 8601
  lastMessageAt: string;      // ISO 8601
  conversations: Conversation[]; // 按 created_at ASC 排列
}
```

保留现有 `Conversation` 接口不变（已在 `lib/darkroom-memory.ts` 中定义）。

### 2. 数据查询

新增 `getRecentConversationsGroupedBySession()`：

- `JOIN darkroom_conversations` 与 `darkroom_sessions`。
- 按 `session_id` 聚合。
- 外层按 `MAX(darkroom_conversations.created_at)` 倒序排列（最近活跃的 session 优先）。
- 返回每个 session 的 summary、第一条/最后一条消息时间、该 session 下全部对话（正序）。
- 取所有有对话的 session，不限制 session 数量（admin 数据量可控）。

SQL 形状：

```sql
SELECT
  s.session_id,
  s.summary,
  MIN(c.created_at) AS first_message_at,
  MAX(c.created_at) AS last_message_at,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', c.id,
      'user_message', c.user_message,
      'assistant_response', c.assistant_response,
      'source_lang', c.source_lang,
      'processed_for_memory', c.processed_for_memory,
      'session_id', c.session_id,
      'created_at', c.created_at
    ) ORDER BY c.created_at ASC
  ) AS conversations
FROM darkroom_conversations c
LEFT JOIN darkroom_sessions s ON c.session_id = s.session_id
GROUP BY s.session_id, s.summary
ORDER BY MAX(c.created_at) DESC;
```

> 若当前数据库驱动/库不支持 `JSON_AGG` + `JSON_BUILD_OBJECT`，则在 TypeScript 中做二次分组，优先保持 SQL 可读性。

### 3. 组件结构

- `/app/admin/darkroom/page.tsx` 保持 Server Component，token 校验和数据获取逻辑不变。
- 新增客户端组件 `components/darkroom/RecentConversationList.tsx`（`'use client'`）。
  - 接收 `groups: SessionConversationGroup[]`。
  - 内部包含 `SortToggleGroup` 和 `SessionCard` 两个子组件（同文件）。
  - 负责排序状态、展开状态。

### 4. 排序交互

排序状态：

```ts
type SortField = "firstMessageAt" | "lastMessageAt";
type SortOrder = "asc" | "desc";

interface SortState {
  field: SortField;
  order: SortOrder;
}
```

默认：`{ field: "lastMessageAt", order: "desc" }`。

按钮组 4 个固定选项：

| 按钮文案 | 状态 |
|---|---|
| 最早开始 ↑ | `{ field: "firstMessageAt", order: "asc" }` |
| 最近开始 ↓ | `{ field: "firstMessageAt", order: "desc" }` |
| 最早活跃 ↑ | `{ field: "lastMessageAt", order: "asc" }` |
| 最近活跃 ↓ | `{ field: "lastMessageAt", order: "desc" }` |

用 `useMemo` 根据当前状态对 `groups` 重新排序。

### 5. 展开/收起交互

- 默认全部收起。
- 用 `useState<Set<string>>` 记录已展开的 `sessionId`。
- 点击 session 标题行切换展开状态。
- 展开图标用 `▸` / `▾` 指示状态。

### 6. UI 细节

**Session 标题行：**

- 左侧：展开指示器 + session `summary`（金色/米白）。
- 右侧：首/末消息时间，格式 `首 2026/06/21 14:32 · 末 2026/06/21 14:45`。
- 整行可点击。

**展开后的消息列表：**

- 按聊天时间正序排列。
- 每条显示：时间、`unprocessed` 标记（保持现有金色 pill）、User 消息、AI 消息。
- 不显示消息 ID 和语言标签。

**排序按钮组：**

- 横向排列 4 个小按钮。
- 当前选中：金色边框/背景。
- 未选中：暗色边框。

**空状态：**

- 无对话时显示 `"No recent conversations."`。

### 7. 颜色与主题

完全复用现有 Darkroom Admin 调色板：

- 背景：`#0a0a0a`
- 金色强调：`#c9a227`
- 米白正文：`#f5f5f0`
- 次要灰：`#a0a0a0`
- 更灰时间：`#666`
- 边框：`#c9a22733` / `#222`

不引入新颜色。

### 8. 边界情况

- `session_id` 为 null：归到 `sessionId: "unassigned"`，summary 显示 `"Unassigned"`。
- `summary` 为空字符串：回退到缩短的 sessionId，如 `sess_abc123…`。
- 单条消息的 session：`firstMessageAt === lastMessageAt`，正常显示。
- 时区统一使用 `Asia/Shanghai`，`toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })`。

### 9. 错误处理

- 数据获取异常由 Server Component 的现有 Promise.all 抛出，Next.js 会走到错误边界。
- 客户端排序/展开不触发服务端请求，无额外错误场景。

### 10. 性能考量

- 所有排序和展开状态在客户端完成，不重新请求。
- 一次性取所有有对话的 session；admin 数据量可控，无需分页。
- 排序使用 `useMemo`，避免每次渲染重新计算。

### 11. 测试计划

- 手动验证：
  1. 多个 session 时是否正确分组。
  2. 切换 4 种排序是否按预期排列。
  3. 点击标题展开/收起是否正常。
  4. `summary` 为空时是否正确回退。
  5. 无 `session_id` 的消息是否归入 Unassigned。
- TypeScript 类型检查通过。

## Out of Scope

- 不修改 Darkroom 聊天正常模式 UI。
- 不新增持久化排序偏好（刷新后恢复默认）。
- 不添加搜索/过滤。
- 不修改 `darkroom_sessions` 或 `darkroom_conversations` 表结构。

## Related Files

- `/app/admin/darkroom/page.tsx`
- `/lib/darkroom-memory.ts`
- `/components/darkroom/RecentConversationList.tsx`（新建）

## Notes

- 根据 Dark Side 工作约定，本次改动仅在 `/admin/darkroom` 彩蛋模式内，不影响站点正常模式展示，无品牌/视觉冲突。
