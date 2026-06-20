# Darkroom 人物档案与实体关系网络改造报告

> 生成时间：2026-06-20
> 范围：Darkroom Chat 记忆系统人物/实体管理全流程改造

---

## 一、改造目标

把 Darkroom 的记忆管理从「零散提及」升级为「围绕人物的档案系统」：

- 覆盖所有人物实体：酒吧已知人物、已识别用户、用户提到的第三方
- 把记忆挂接到实体，支持按人物召回
- 建立人物关系图（friend / partner / colleague / ex / sibling / knows / mentioned_with）
- 聊天时针对提到的人物注入「人物卡」
- 保留隐私控制：第三方档案 TTL、用户可要求被遗忘

---

## 二、Phase 1：数据层升级

### 新增/修改的表

1. **`darkroom_entities`**（扩展）
   - 新增 `entity_type`、`profile` (JSONB)、`mention_count`、`first_seen_at`、`last_mentioned_at`
   - `profile` 结构示例：
     ```json
     {
       "description": "酒吧熟客，常与阿林一起来",
       "preferences": ["金汤力", "吧台座位"],
       "known_facts": ["上次带了朋友来"],
       "relationship_hints": "与阿林关系密切",
       "confidence": 0.82,
       "is_known_entity": true,
       "privacy": { "consent": "implicit", "ttl_days": 90, "sensitive": false }
     }
     ```

2. **`darkroom_memory_entities`**（新建）
   - 关联记忆与实体
   - `role`：subject / object / co_mention / mentioned

3. **`darkroom_entity_relations`**（新建）
   - 人物关系边
   - `relation_type`：friend、partner、colleague、ex、sibling、knows、mentioned_with

### 迁移结果

运行 `scripts/seed-known-entities-to-db.ts` 后：

```text
entities by source:
  knowledge_base: 11
  memory:          3
  user_mentioned: 47
relations: 0
memory_links: 150
```

- 11 个 `KNOWN_ENTITIES`（Tee/老王、小马/Phillip、Dex、Aidan 等）已写入 DB
- 698 条记忆被扫描，106 条与实体建立关联

---

## 三、Phase 2：提取层增强

### 改动点

- `lib/darkroom-chat.ts` 新增 `extractEntitiesFromText(text, isZh)`：
  - 识别「我昨天和阿林一起…」「小马说…」「I went out with Alex…」等自然提及
  - 自动过滤 MBTI、停用词
- `data/darkroom-messages-zh.json` / `-messages.json` 的 `extractionPrompt`：
  - 要求 LLM 返回 `memories` + `entities` + `relations`
  - 输出格式改为单个 JSON 对象，同时兼容旧格式（JSON 数组）
- `app/api/darkroom/extract/route.ts`：
  - 解析新格式
  - 把实体写入 `darkroom_entities`
  - 把关系写入 `darkroom_entity_relations`
  - 把记忆与实体关联
  - 注入已知实体别名提示（如老王 → Tee）

---

## 四、Phase 3：聊天层人物卡

### 改动点

- `lib/darkroom-memory.ts` 新增 `buildEntityCard(...)`：
  - 生成包含身份、关系、偏好、近期记忆的人物卡
- `app/api/darkroom/chat/route.ts`：
  - 识别当前话题实体
  - 最多生成 2 张人物卡注入 prompt
  - 实体关联记忆优先于向量/关键词召回
- `lib/darkroom-budget.ts`：
  - `ChatPromptComponents` 新增 `entityCards`
  - 预算紧张时：先压缩无关 memory，再考虑 drop 人物卡

人物卡示例：

```text
[人物卡：小马]
- 身份：酒吧熟客，常与阿林一起来
- 关系：阿林（partner）、Dex（friend）
- 偏好：金汤力、吧台座位
- 近期记忆：
  - 上次和阿林一起来坐在吧台
```

---

## 五、Phase 4：Profile 自动聚合

### 改动点

- 新建 `lib/darkroom-entity-summary.ts`：
  - `summarizeEntityProfile(entityId, isZh)`：读取该实体最近 20 条记忆 + 关系，调用 LLM 生成摘要
  - `summarizeAllEntityProfiles({ limit, minMentionCount, isZh })`：批量聚合
- 新建 `scripts/summarize-entity-profiles.ts`：可手动或定时运行

摘要字段：

- `description`：100 字内画像
- `preferences`：最多 5 条偏好
- `known_facts`：最多 5 条可确认事实
- `relationship_hints`：50 字内关系提示
- `confidence`：0-1 可信度

### 运行方式

```bash
export DEEPSEEK_API_KEY=...
npx tsx --env-file=.env.local scripts/summarize-entity-profiles.ts
```

建议先小批量试运行：

```bash
SUMMARIZE_LIMIT=5 SUMMARIZE_MIN_MENTIONS=3 npx tsx --env-file=.env.local scripts/summarize-entity-profiles.ts
```

---

## 六、Phase 5：隐私与降级

### 改动点

- `lib/darkroom-memory.ts`：
  - 新增 `EntityPrivacy` 类型
  - `upsertEntity` 对新 `user_mentioned` 实体默认写入 `privacy: { consent: "implicit", ttl_days: 90, sensitive: false }`
  - `forgetEntity(name)`：把实体标记为 `declined`，清空 profile 和关系
  - `pruneExpiredEntityProfiles(defaultTtlDays = 90)`：清理过期第三方档案
- `lib/darkroom-chat.ts` 新增 `detectForgetRequest(message, isZh)`：
  - 识别「忘了我」「别提小马了」「Forget about me」「Don't mention Alex」等
- `app/api/darkroom/chat/route.ts`：
  - 检测到遗忘请求后立即清除对应实体信息，并返回确认

### TTL 清理

```bash
npx tsx --env-file=.env.local -e "import { pruneExpiredEntityProfiles } from './lib/darkroom-memory'; pruneExpiredEntityProfiles(90).then(n => console.log('pruned', n))"
```

---

## 七、验证结果

```text
npm run typecheck  ✓
npm run test       ✓ (100 passed)
npm run build      ✓
```

---

## 八、需要你人工检查确认的信息

由于涉及 LLM 生成和用户隐私，请重点抽查以下内容：

1. **已知实体描述是否准确**
   - 检查 `darkroom_entities` 中 11 个 `knowledge_base` 实体的 `profile.description`
   - 来源是 `KNOWN_ENTITIES` 的 `zhHint`/`enHint`，如有误请改 JSON 后重新迁移

2. **记忆关联是否张冠李戴**
   - 抽查 `darkroom_memory_entities` 表
   - 重点看 source_identity 或关键词相似导致的错误关联

3. **人物卡注入后的回复风格**
   - 部署后测试聊到「小马」「阿林」等人物
   - 确认 AI 基于档案回复，不编造

4. **LLM 自动摘要的可信度**
   - 运行 `summarize-entity-profiles.ts` 后抽查 `entity.profile`
   - 摘要可能包含幻觉，低 confidence 的要人工复核

5. **「遗忘」指令是否符合预期**
   - 测试「忘了我」「别提小明了」
   - 确认只清除 profile/关系、保留名字，这种软删除程度是否足够

---

## 九、推荐后续操作

1. 本地/生产部署前再次验证：
   ```bash
   npm run typecheck && npm run test && npm run build
   ```

2. 部署后观察 Vercel log：
   ```text
   [darkroom:extract] batch=... raw_memories=... entities=... relations=...
   ```

3. 运行 profile 聚合前，先小批量测试。

4. 如需定时 TTL 清理，可配置 Vercel Cron 或本地定时任务。

---

## 十、修改文件清单

- `lib/darkroom-memory.ts`
- `lib/darkroom-chat.ts`
- `lib/darkroom-budget.ts`
- `lib/darkroom-entity-summary.ts`（新建）
- `lib/darkroom-memory.test.ts`
- `lib/darkroom-chat.test.ts`
- `app/api/darkroom/extract/route.ts`
- `app/api/darkroom/chat/route.ts`
- `data/darkroom-messages-zh.json`
- `data/darkroom-messages.json`
- `scripts/seed-known-entities-to-db.ts`
- `scripts/summarize-entity-profiles.ts`（新建）
- `scripts/fix-entity-sources.ts`（一次性修复脚本）
