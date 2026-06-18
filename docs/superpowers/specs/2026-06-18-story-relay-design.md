# 啾喔故事接力：详细设计

> 记录日期：2026-06-18  
> 状态：设计定稿，待进入实现计划  
> 关联文档：[方案选项](2026-06-18-story-relay-approaches.md)

## 目标

为 JIUWO 啾喔网站增加一个「故事接力」彩蛋功能。AI 以酒吧为背景、以网站和 Darkroom 记忆中出现的人名为角色写一个 300-500 字的开头，然后向用户提问；用户输入自己的名字并回答后，AI 继续续写 300-500 字并再次提问，循环往复。所有贡献者以 milestone 形式被记录在故事中。

测试期间不放置公开入口，仅通过秘密路径访问。

---

## 已确认的核心决策

- **故事模式**：公共接龙，全站仅一篇正在进行的公共故事。
- **测试期入口**：秘密路径 + Token，例如 `/story-relay?token=jiuwo`。
- **AI 提问形式**：混合模式。AI 先问开放性问题，同时给出 2 个建议方向。
- **Milestone 展示**：桌面端右侧 contributor 时间线；移动端行内标签 + 可折叠底部 contributor 墙。
- **语言策略**：双语界面，AI 同时生成中英文两个版本的故事段落。
- **持久化**：复用现有 Neon Postgres，新增两张表。
- **重置与归档**：管理员一键「开启新章」，旧故事以 JSON 快照形式归档。
- **人名来源**：动态从 `darkroom_memories` 抽取 + `data/story-relay-seeds.json` 手动保底名单。
- **用户姓名**：服务端 session 记录，首次提交后提示「姓名后续很难更改」。

---

## 数据模型

### `story_relay_segments`

每段故事一个记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | serial PK | 自增 |
| `sequence` | integer | 段落顺序，从 0 开始 |
| `author_name` | varchar(64) | 贡献者姓名，AI 起头时为 "AI" |
| `user_prompt` | text | 用户对 AI 问题的回答 / 其他要求 |
| `ai_question_zh` | text | AI 上一段结尾提出的中文问题 |
| `ai_question_en` | text | AI 上一段结尾提出的英文问题 |
| `story_zh` | text | 本段中文故事正文 |
| `story_en` | text | 本段英文故事正文 |
| `suggestion_1_zh` | text | 第一个建议方向（中文） |
| `suggestion_1_en` | text | 第一个建议方向（英文） |
| `suggestion_2_zh` | text | 第二个建议方向（中文） |
| `suggestion_2_en` | text | 第二个建议方向（英文） |
| `session_id` | varchar(255) | 匿名会话 ID（来自 HTTP cookie），用于关联同一位贡献者 |
| `created_at` | timestamp | 创建时间 |

### `story_relay_chapters`

重置时把当前故事归档到这里。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | serial PK | 自增 |
| `chapter_number` | integer | 第几章 |
| `segments_json` | jsonb | 整章所有 segment 的完整快照 |
| `created_at` | timestamp | 本章起始时间 |
| `archived_at` | timestamp | 本章归档时间 |

### 数据流说明

- 当前故事永远从 `story_relay_segments` 按 `sequence` 顺序读取。
- 重置时：将 `story_relay_segments` 整体打包为 `segments_json`，写入 `story_relay_chapters`，然后清空 `story_relay_segments`，并插入 AI 生成的全新开头作为 `sequence = 0`。
- `session_id` 来自 HTTP cookie，让同一浏览器连续贡献时显示同一人名，也便于未来做简单频率限制。用户首次打开页面时若不存在，后端生成一个并写入 cookie。

---

## 接口设计

### `GET /api/story-relay/state`

页面加载时调用，返回当前故事完整状态。

返回：

```json
{
  "segments": [
    {
      "sequence": 0,
      "authorName": "AI",
      "storyZh": "...",
      "storyEn": "...",
      "aiQuestionZh": "...",
      "aiQuestionEn": "...",
      "suggestion1Zh": "...",
      "suggestion1En": "...",
      "suggestion2Zh": "...",
      "suggestion2En": "..."
    }
  ],
  "latestQuestion": { "zh": "...", "en": "..." },
  "latestSuggestions": [
    { "zh": "...", "en": "..." },
    { "zh": "...", "en": "..." }
  ],
  "contributors": [
    { "name": "小明", "segments": [1, 3] }
  ]
}
```

### `POST /api/story-relay/continue`

用户提交回答后调用。

请求体：

```json
{
  "authorName": "小明",
  "userInput": "我觉得主角应该留下来",
  "token": "jiuwo"
}
```

处理流程：

1. 校验 `token`（测试期）。
2. 从 HTTP cookie 读取 `story_relay_session_id`，不存在则生成并设置 cookie。
3. 取 `story_relay_segments` 最新段落作为上下文。
4. 调用 DeepSeek API，要求 AI 根据 `userInput` 续写 300-500 字，并生成新的中英文问题 + 两个建议方向。
5. 将新段落写入 `story_relay_segments`，`session_id` 使用 cookie 中的值。
6. 返回新段落给前端展示。

### `POST /api/story-relay/reset`

管理员重置故事。

请求体：

```json
{
  "token": "admin-token"
}
```

处理流程：

1. 校验 admin token。
2. 将当前 `story_relay_segments` 打包写入 `story_relay_chapters`。
3. 清空 `story_relay_segments`。
4. 调用 AI 生成新的开头（300-500 字，中英文），并附带初始问题 + 两个建议方向。
5. 写入 `story_relay_segments` 作为 `sequence = 0`。

### `GET /api/story-relay/chapters`

获取历史归档篇章列表（首版可只做基础返回，供未来章节浏览页使用）。

---

## 前端页面结构

### URL

- 测试期：`/story-relay?token=jiuwo`
- 正式上线后可改为 `/story-relay`

### 页面布局

**桌面端**

- 主栏：故事流 + 当前 AI 提问卡片 + 输入区
- 右侧边栏：contributor 时间线

**移动端**

- 主栏：故事流，每段末尾保留「由谁续写」小标签
- 底部：可折叠 contributor 墙

### 输入区

- 姓名输入框（首次提交后提示很难更改）
- 回答/要求输入框
- 「续写故事」按钮
- 显示 AI 当前问题 + 两个建议方向作为可点击快捷输入

### 视觉风格

- 沿用 JIUWO 品牌色：#c9a227（金）、#0a0a0a（纯黑）、#f5f5f0（米白）。
- 故事正文以阅读舒适为优先：
  - 桌面端字体 18px / 移动端 16px，行高 1.8。
  - 段落最大宽度约 680px，避免过长的行距造成阅读疲劳。
  - 段间距 24-32px，让故事有呼吸感。
  - 每段故事使用轻微的首行缩进或段落间距，营造小说阅读节奏。
- 故事段落之间用细色线或小型装饰符号分隔，暗示时间/叙事的推进。
- contributor 时间线 / 标签使用较小字号、低对比色，避免抢夺故事主体注意力。
- 输入区与故事流之间用明显但不刺眼的边界分开，让用户知道「下面轮到你」。
- 整体保持现有暗色极简风格，不引入额外 glow 效果；但可在故事卡片边缘使用极细的 #2a2a2a 边框营造层次感。
- 长文字区域避免纯黑背景与纯白文字的强对比，正文使用 #f5f5f0，辅助信息使用 #888，降低长时间阅读的眼压。

---

## AI Prompt 策略

复用现有 DeepSeek 调用方式，使用独立的 system prompt。

### 续写请求 prompt

```
你是 JIUWO（啾喔）酒吧的驻场 storyteller。酒吧位于上海巨鹿路 397 号，氛围像"朋友的客厅"。
请用以下人名作为故事角色：{names_from_darkroom_memories + manual_seeds}
当前故事已有 {n} 段。上一段结尾的问题是：{latest_question}
用户的回答是：{user_input}
要求：
1. 续写 300-500 字，保持酒吧场景和社群感。
2. 结尾提出一个开放性问题，推动剧情。
3. 同时给出两个简短的剧情建议方向（A / B）。
4. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
5. 中英文都要自然、有文学感，不要直译。
6. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。
```

### 起头 prompt

重置或首次启动时使用，无上下文：

```
你是 JIUWO（啾喔）酒吧的驻场 storyteller。请用以下人名：{names}，围绕酒吧写一段 300-500 字的开头。
要求：
1. 场景在上海巨鹿路 397 号的 JIUWO 酒吧。
2. 风格温暖、神秘、有社群感。
3. 结尾提出一个开放性问题。
4. 给出两个建议方向。
5. 输出 JSON：{ storyZh, storyEn, questionZh, questionEn, suggestion1Zh, suggestion1En, suggestion2Zh, suggestion2En }
6. 中英文都要自然、有文学感，不要直译。
7. 故事可以暧昧、性感、有情欲张力，允许对身体和性器官使用暗示性、文学化的描写，但避免直白、机械、色情片的写法。保持文学感和留白。
```

### 人名来源

- 每次调用前，后端从 `darkroom_memories` 中读取所有置信度 ≥ 0.6 的记忆。
- 使用简单启发式规则提取候选：连续 2-4 个汉字的词组、英文首字母大写的单词。
- 再用一个小型 LLM 调用（或正则 + 常见姓氏表）过滤出真实人名，按出现频次或置信度排序，取前 3-5 个。
- 如果动态抽取不足 3 个，从 `data/story-relay-seeds.json` 补足。
- 保底名单由运营者维护。

### 内容尺度

**允许**

- 暧昧、情欲张力、调情与亲密场景
- 对性器官或身体的暗示性、隐喻性描写
- queer 情感与身体亲密
- 醉酒、脆弱、靠近、耳语等场景

**不允许**

- 直白、暴露、机械式的性行为细节描写
- 强迫、非自愿、权力不对等的性暗示
- 未成年相关内容
- 仇恨、歧视、侮辱性内容

**越界处理**

AI 返回拒绝信息，不写入数据库。前端显示：

> 「AI 觉得这一段写得太直白了，啾喔的故事更喜欢用氛围和隐喻来说。换一种含蓄点的写法？」

---

## 异常处理

| 场景 | 处理 |
|---|---|
| AI 返回非 JSON | 后端尝试提取，失败则返回「AI 走神了，请重试」 |
| 数据库写入失败 | 不返回成功状态，前端提示重试 |
| 并发冲突 | 后端重试一次，仍冲突则提示「有人刚刚接龙了，请刷新后再试」 |
| token 错误 | 返回 403，页面显示「测试期入口暂未开放」 |
| 用户没填名字 | 前端校验，提交前拦截 |
| 用户输入为空 | 前端校验 |

---

## 测试计划

### 本地测试

- 用 mock token 验证页面能正常加载。
- 模拟多次续写，检查 `sequence` 递增、contributor 列表更新。
- 测试重置接口，确认旧故事进入 `story_relay_chapters`。

### AI 输出测试

- 跑 10 轮起头，检查中英文是否都自然、是否围绕酒吧、是否含有人名。
- 跑 10 轮续写，检查是否根据 user input 推进、问题是否相关、建议方向是否合理。
- 测试越界输入，确认拒绝分支生效。

### 并发测试

- 用两个浏览器同时提交，验证是否只有一个成功，另一个收到友好提示。

### 移动端测试

- 检查 contributor 墙折叠/展开、输入框在键盘弹出时的表现。

---

## 上线前检查清单

- [ ] 环境变量配置 `STORY_RELAY_TOKEN` 和 `STORY_RELAY_ADMIN_TOKEN`
- [ ] DeepSeek API 配额足够（每段生成中英文，token 消耗约为单语 2 倍）
- [ ] Neon 表结构 migration 已执行
- [ ] 测试期入口没有出现在任何导航或 sitemap 中
- [ ] 内容尺度护栏已写入 prompt 并测试

---

## 关键文件（预估）

- `app/story-relay/page.tsx`：故事接力页（测试期带 token 校验）
- `components/StoryRelayTerminal.tsx`：故事流、输入区、 contributor 墙
- `app/api/story-relay/state/route.ts`：获取当前故事状态
- `app/api/story-relay/continue/route.ts`：用户续写接口
- `app/api/story-relay/reset/route.ts`：管理员重置/归档接口
- `app/api/story-relay/chapters/route.ts`：历史归档列表
- `lib/story-relay.ts`：数据库操作
- `lib/story-relay-ai.ts`：AI prompt 构建与解析
- `data/story-relay-seeds.json`：保底人名与故事种子
- `migrations/20260618_add_story_relay.sql`：数据库迁移

---

## 后续迭代方向

1. **章节浏览**：把归档页做成可浏览的「往期篇章」。
2. **预审兜底**：如果公共接龙出现 abuse，引入待审队列作为开关。
3. **章节主题**：支持限定主题周，每章一个主题。
4. **人名池优化**：根据 Darkroom 记忆增长，调整抽取逻辑和保底名单。
5. **视觉入口**：测试完成后改为固定路由，并考虑低调放入「关于」或「活动」页面。

---

## 相关文档

- [方案选项](2026-06-18-story-relay-approaches.md)
- [Darkroom 记忆流设计](2026-06-14-darkroom-memory-flow-design.md)
- [Darkroom Portal 计划](../plans/2026-06-14-darkroom-portal-plan.md)
