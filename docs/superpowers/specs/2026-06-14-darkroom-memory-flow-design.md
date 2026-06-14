# Darkroom 对话记忆注入说明

## 三层记忆结构

当前 Darkroom 终端的记忆系统分为三个层次，每层作用不同：

### 1. 当前会话历史（Session History）
- **位置：** 前端 `DarkroomTerminal.tsx` 的 `history` state
- **生命周期：** 页面刷新即清空
- **作用：** 让 AI 在同一次访问中记住最近 6 轮对话上下文
- **注入方式：** 每次调用 `/api/darkroom/chat` 时，`history.slice(-6)` 被放在 system prompt 之后、当前消息之前

### 2. 原始对话记录（Conversations）
- **位置：** Neon Postgres `darkroom_conversations` 表
- **生命周期：** 云端持久保存
- **作用：** 保留每次访问的原始 user/assistant  exchange，用于后续批量提取记忆
- **写入时机：** 每次用户发送消息并得到 AI 回复后，前端调用 `/api/darkroom/extract`，后端先把 exchange 原样写入该表

### 3. 提取后的集体记忆（Memories）
- **位置：** Neon Postgres `darkroom_memories` 表
- **生命周期：** 云端持久保存，每语言最多 500 条，旧记忆按置信度/时间淘汰
- **作用：** 跨访问者共享的抽象痕迹，让 AI 在相关话题上自然引用前人留下的信号
- **写入时机：** 当某语言的未处理对话累积到 **2 条**时，后端取出这 2 条对话，调用 DeepSeek 综合提取 0–3 条记忆，写入该表，并标记这 2 条对话为已处理

## 数据流

```
用户输入
  │
  ▼
DarkroomTerminal.tsx
  │  ├─ 把 user message 加入本地 history
  │  └─ 调用 /api/darkroom/chat（携带 history + 当前消息）
  ▼
app/api/darkroom/chat/route.ts
  │  ├─ 拼接 system prompt + knowledge base
  │  ├─ 用当前消息检索 darkroom_memories（最多 5 条相关记忆，置信度 ≥ 0.6）
  │  ├─ 把检索到的记忆注入 system prompt
  │  └─ 调用 DeepSeek 生成回复
  ▼
返回 assistant response
  │
  ▼
DarkroomTerminal.tsx
  │  ├─ 显示 assistant response
  │  └─ 调用 /api/darkroom/extract
  ▼
app/api/darkroom/extract/route.ts
  │  ├─ 把 user_message + assistant_response 写入 darkroom_conversations
  │  └─ 检查未处理对话数量
  │       └─ >= 2 条：批量提取记忆 → 去重 → 写入 darkroom_memories → 标记已处理
  │       └─ 每次最多处理 5 批 = 10 条对话（自动消化积压）
  ▼
下一位用户/下一轮对话
```

## 提取与去重规则

### 哪些内容会被提取
满足以下任意一条的对话组合会被综合提取成记忆：
- 用户对饮品、茶、酒、鸡尾酒、氛围或音乐的偏好、口味或观点
- 提到的与节点相关的任何人、事件或地点（包括昵称、伴侣、朋友、常客）
- 关于酒吧、街区或文化的有趣事实、故事或观察
- 用户行为中的重复主题或模式
- 与节点氛围相关的个人情绪状态（孤独、庆祝、怀旧、兴奋等）
- 用户的计划、意图或未来到访信号
- 用户对人、地点或事实提供的纠正或澄清

### 置信度门槛
- 可存储记忆的最低置信度：**0.6**
- 检索记忆时的最低置信度：**0.6**

### 去重机制
存储新记忆前，会与已有记忆进行关键词重叠度计算。如果相似度 ≥ 65%，则跳过该记忆，避免同一事实被反复记录（例如大量重复的"Devil 是谁"）。

## 为什么刷新后"不记得"刚才聊的内容？

刷新页面会清空前端 `history` state。此时：
- 原始对话已经写入 `darkroom_conversations`，但**还没满 2 条**，所以不会触发提取
- 即使已经提取成 `darkroom_memories`，它也是**集体共享**的抽象痕迹，不是个人聊天记录
- 除非下一条消息恰好命中这些记忆的关键词，否则 AI 不会主动提及

如果希望同一个用户刷新后仍能继续完整对话，需要额外实现**个人会话持久化**（sessionId + 按 session 恢复 history），当前系统没有做这个。

## 如何查看当前数据

部署后访问受保护的调试接口：

```bash
curl -H "Authorization: Bearer <DARKROOM_ADMIN_TOKEN>" \
  https://www.jiuwoshanghai.net/api/darkroom/admin
```

或在浏览器直接打开：

```
https://www.jiuwoshanghai.net/api/darkroom/admin?token=<DARKROOM_ADMIN_TOKEN>
```

返回 `memories` 和 `conversations` 的统计与最近 20 条记录。

## 关键文件

- `components/DarkroomTerminal.tsx`：前端 state、对话流、调用 extract
- `app/api/darkroom/chat/route.ts`：检索并注入记忆
- `app/api/darkroom/extract/route.ts`：存对话、批量提取记忆、去重
- `lib/darkroom-memory.ts`：数据库表操作、去重逻辑
- `data/darkroom-messages.json` / `data/darkroom-messages-zh.json`：system prompt 与 extraction prompt
