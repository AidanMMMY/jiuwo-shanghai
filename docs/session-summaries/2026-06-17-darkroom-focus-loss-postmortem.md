# Darkroom 连续对话「失焦」问题复盘

> 时间：2026-06-17  
> 状态：已修复并验证  
> 涉及范围：Darkroom 彩蛋聊天（`/api/darkroom/chat`、`/api/darkroom/extract`）

## 现象

在连续对话中，只要用户提到**知识库外的人名**或**用指代继续聊同一个人**，AI 就会失焦：

- 用户提到「司徒」→ AI 回应 → 用户问「他是不是很帅」，AI 反问「这个“他”是谁」或跳到小马。
- Dex 话题下用户问「他喜欢谁」「他单身吗」，AI 把「他」理解成别人。
- nemo 这类完全不在 `KNOWN_ENTITIES` 里的人名，系统直接无法锁定。
- 用户对 AI 的提问给出短回答（如「感情方面」）时，AI 没有当作答案承接。

## 真正的根因

问题**不在 prompt 写得不够细**，而在两个架构/服务层故障把话题追踪赖以工作的「状态」破坏了：

### 1. Neon 表结构漂移：`darkroom_conversations.session_id` 缺失

生产环境的 `darkroom_conversations` 表在早期代码没有 `session_id` 时创建，后续代码加了字段但**没有执行 migration**。Vercel log 里反复出现：

```
[darkroom:extract] fatal error: column "session_id" does not exist
[darkroom:chat] history hydrate error: column "session_id" does not exist
```

这导致：

- `/api/darkroom/extract` 每次存对话都失败 → **对话没有持久化**。
- `/api/darkroom/chat` 想从 Neon 恢复历史时失败 → **刷新后历史丢失**。
- `updateSessionSummary` 没有数据可总结 → `darkroom_sessions.primary_entity` 停留在旧值（或 null）。
- `recordMentionedNames` 无法写入 → **记忆外名字（如司徒、nemo）永远进不了动态实体表**。

结果：话题状态只能靠前端的临时 `history` 和硬编码名单硬撑，跨回合、跨页面后必然跑焦。

### 2. Classifier 返回非法 JSON，解析直接抛异常

Vercel log 显示：

```
[darkroom:chat] classifier failed: SyntaxError: Unexpected end of JSON input
```

`deepseek-v4-flash` 偶尔会返回空内容或截断 JSON。`classifyMessageWithModel` 没有防御，解析失败后返回 `null`，系统只能退回到正则/已知实体扫描。nemo 这种名字不在任何实体表里，焦点自然丢失。

### 3. 话题状态优先级把「session 锚点」放在「当前历史」之前

即使 persistence 和 classifier 都正常，旧版 `buildTopicState` 里 stale 的 `sessionPrimaryEntity`（比如上一轮的小马）会覆盖当前历史里的 Dex 话题，导致「我想更了解他」被错解成小马。

## 真正发挥了作用的修复

### 1. 修复 persistence：给 `darkroom_conversations` 补上 `session_id`

- 新增 migration：[migrations/003_darkroom_conversations_session_id.sql](../../migrations/003_darkroom_conversations_session_id.sql)
- 在 [`lib/darkroom-memory.ts`](../../lib/darkroom-memory.ts#L176-L193) 的 `ensureConversationsTable()` 里加了防御性：

```ts
// Defensive: older deployments created this table before session_id existed.
await sql`ALTER TABLE darkroom_conversations ADD COLUMN IF NOT EXISTS session_id VARCHAR(64)`;
await sql`CREATE INDEX IF NOT EXISTS idx_darkroom_conversations_session ON darkroom_conversations(session_id, created_at DESC)`;
```

这样**下一次 API 调用就会自动修复表结构**，不需要手动跑 SQL。

### 2. 让 classifier 成为可依赖的信号

在 [`lib/darkroom-chat.ts`](../../lib/darkroom-chat.ts#L235-L318) 里把 `classifyMessageWithModel` 改得足够鲁棒：

- 增加空内容保护。
- 提取 `{}` 块，兼容 markdown 包装或多余文字。
- `max_tokens` 从 80 提到 120。
- prompt 明确要求：指代必须解析成对话历史里最近的具体人名，禁止填「某个人/有人/他/someone」等泛指。

### 3. 重排话题状态优先级

在 [`lib/darkroom-chat.ts`](../../lib/darkroom-chat.ts#L332-L511) 的 `buildTopicState` 里，当前逻辑是：

1. 如果最新消息含指代，先看 classifier 给出的具体人名（能识别 nemo 等记忆外名字）。
2. 如果 classifier 没命中，再看 session 锚点是否出现在 prior history 里。
3. 扫描 prior history 中的已知/动态实体。
4. 最后才用 session 锚点兜底。
5. 显式 `shift` 意图可以覆盖当前话题。

这样**当前历史里的人/话题优先于旧的 session 锚点**，stale anchor 不再覆盖 Dex。

### 4. 用 system prompt 禁止「重新锁定坐标」式回避

在 [`lib/darkroom-chat.ts`](../../lib/darkroom-chat.ts#L587-L611) 的 `buildTopicReminder` 里明确写入：

> 不要反问「指谁」「哪位」，不要请求用户重新锁定坐标，不要以指代模糊为由回避或要求澄清。直接回答。

同时 [`isConcreteTopicEntity`](../../lib/darkroom-chat.ts#L83-L88) 把代词和泛指加入 denylist，避免 classifier 输出退化。

### 5. 用测试把关键场景固定下来

新增 [`lib/darkroom-chat.test.ts`](../../lib/darkroom-chat.test.ts) 覆盖：

- Dex 多轮指代继承。
- Dex 话题下 Aidan 作为宾语时仍锁定 Dex。
- stale session anchor（小马）不覆盖当前 Dex。
- classifier 显式 shift 能覆盖话题。
- nemo 通过 classifier 和 session anchor 继承。

## 没有奏效的做法

- **反复调整 system prompt**：在前几轮修复里只改 prompt，失焦问题反复出现。因为模型根本没拿到正确/完整的状态输入，prompt 再细也没用。
- **增加更多规则去「猜」指代**：没有持久化历史 + classifier 失败时，规则扫描范围被限制在硬编码名单里，无法处理记忆外名字。

## 教训

1. **多轮对话的聚焦问题，首先是状态持久化和信号可靠性问题，其次才是 prompt 问题。** 状态管道断了，prompt 只能打补丁。
2. **「没日志就没真相」。** 直到打开 Vercel log 看到 `column "session_id" does not exist` 和 `Unexpected end of JSON input`，方向才立刻清晰。
3. **修复顺序很重要：** 先保证 persistence 和 classifier 管道可靠，再调整 prompt/规则。顺序反过来会反复试错。
4. **测试必须覆盖反直觉场景：** 比如「session 锚点是旧的，但当前历史已经换了话题」，这是本次失焦的主要触发条件之一。

## 后续监控

部署后继续观察 Vercel log 中的以下信号：

- `[darkroom:chat] classifier raw:` / `[darkroom:chat] classifier result:` —— classifier 是否稳定返回合法 JSON。
- `[darkroom:chat] history hydrate error:` —— `session_id` 列是否还有问题。
- `[darkroom:extract] fatal error:` —— 存对话是否还失败。
- 用户反馈中是否再出现「这个“他”是谁」类反问。

## 相关提交

- `dd1284a` — `fix(darkroom): harden topic lock against ambiguous pronouns and generic classifier outputs`
