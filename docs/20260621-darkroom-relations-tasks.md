# Darkroom 关系提取与清理任务清单

**生成日期**：2026-06-21  
**涉及系统**：Darkroom Chat 记忆/实体/关系提取  
**数据表**：`darkroom_entities`、`darkroom_entity_relations`、`darkroom_memories`、`darkroom_memory_entities`、`darkroom_conversations`

---

## 一、已完成任务

### 1. 关系提取能力补齐
- **文件**：`app/api/darkroom/extract-relations/route.ts`
- **内容**：新增独立端点，从单条记忆文本中提取人物关系
- **状态**：✅ 已完成并部署

### 2. 历史记忆批量提取
- **文件**：`scripts/extract-relations-from-memories.ts`
- **内容**：扫描 282 条含关系线索的历史记忆，调用 extract-relations API
- **结果**：提取 139 条关系，初步清洗后 43 条
- **状态**：✅ 已完成

### 3. 时区显示修复
- **文件**：`app/admin/darkroom/page.tsx`、`components/DarkroomChat.tsx`、`hooks/useDarkroomChat.ts`
- **内容**：数据库 TIMESTAMPTZ（UTC）统一按 `Asia/Shanghai` 显示
- **状态**：✅ 已完成

### 4. 身份锁定 false positive 修复
- **文件**：`lib/darkroom-chat.ts`
- **内容**：修复 `looksLikeName`、`extractExplicitName`、`extractUserNameFromHistory`
- **验证**：111 个测试全部通过
- **状态**：✅ 已完成

### 5. 关系表清洗（冲突 + 方向）
- **文件**：`scripts/clean-entity-relations.ts`
- **内容**：
  - 注册 canonical 别名：Philip→Phillip、Aiden→Aidan、tee（老王）→Tee、阿远（Icky）→Icky
  - 统一关系方向：`entity_a_id <= entity_b_id`
  - 按优先级解决冲突：`ex > affair > partner > lover > fwb > date > colleague > friend > sibling > knows > mentioned_with`
- **结果**：79 条 → 43 条，19 组冲突已解决，方向全部统一
- **状态**：✅ 已完成

### 6. 重复实体合并
- **文件**：`scripts/merge-duplicate-entities.ts`
- **内容**：合并 4 组重复实体
- **结果**：
  - `Aiden` → `Aidan`
  - `阿远（Icky）` → `Icky`
  - `tee（老王）` → `Tee`
  - `Philip` → `Phillip`
- **实体总数**：109 → 105
- **状态**：✅ 已完成

### 7. 多重关系模型改造
- **文件**：`lib/darkroom-memory.ts`、`app/api/darkroom/extract-relations/route.ts`、`scripts/clean-entity-relations.ts`、`scripts/add-multiplex-relations.ts`
- **内容**：
  - `darkroom_entity_relations` 表增加 `is_current` BOOLEAN 字段
  - `recordEntityRelation` 支持 `isCurrent` 参数
  - 关系类型增加 `crush`（暗恋/好感）
  - extract-relations API 的 prompt 要求 LLM 输出 `is_current`
  - clean 脚本改为保留同一人对的多重关系，只去重方向/实体名完全相同的记录
  - 手动添加指定关系：
    - Aidan - Dex：`friend`(current) + `crush`(current)
    - Aidan - Bob：`friend`(current) + `crush`(past)
    - Zack - Phillip：`friend`(current) + `date`(past) + `fwb`(past)
- **结果**：43 条 → 47 条
- **状态**：✅ 已完成

---

## 二、待你检查 / 确认

### 1. 多重关系设计是否合理
当前表结构允许同一人对存在多种关系，并用 `is_current` 区分时态。请确认以下示例是否符合你的预期：

| 人物对 | 当前关系 | 过去关系 |
|---|---|---|
| Aidan - Dex | friend + crush | — |
| Aidan - Bob | friend | crush |
| Zack - Phillip | friend | date + fwb |
| Phillip - AGNOSIA | friend | affair |

注意：Phillip - AGNOSIA 当前没有任何 `is_current = true` 的关系。如果实际现在仍是某种关系，需要手动更正其中一条为 current。

### 2. 是否 push
当前本地有多个 commit 未 push：
- `d6b0841` docs: update relation corrections...
- `3895c33` feat(darkroom): clean entity relations...
- 更早的 `06946ac`（normalizeEntityName）

如需 push，请明确说 push。

---

## 三、可选下一步

### 1. 清理非人占位符实体
entities 表中仍存在早期提取错误的占位符，例如：
- 疑问碎片：`这个目标是谁`、`是谁`、`我是什`
- 关系角色占位符：`男朋友`、`约会对象`、`男性朋友`、`当前伴侣`、`长期男友`、`现任男友`
- 泛化指代：`用户`、`一位用户`、`某位顾客`

清理后 entities 表会更干净，但不会改变当前 47 条关系。

### 2. 从 conversation 重新提取关系
当前 47 条关系主要来自 memory-based 提取。可以重新打开 conversation backfill，让 `/api/darkroom/extract` 的 batchPrompt 也输出关系，补充可能遗漏的线索，并带上 `is_current`。

### 3. 在 Admin 界面展示关系图
当前 admin 只显示实体列表，没有可视化关系网络。可以添加一个关系表格或简单图视图，按 `is_current` 分组显示。

### 4. 给关系增加证据上下文
当前 `evidence_memory_id` 在清洗过程中已保留，但部分关系证据为空。可以后续补全 evidence 或 confidence 评分机制。

---

## 四、当前关键数据

### 关系表统计
- **总数**：47 条
- **方向统一**：`entity_a_id <= entity_b_id`，无反向重复
- **同一人对多重关系**：已支持
- **关系类型分布**（按 `is_current` 分组）：

| 类型 | current=true | current=false | 合计 |
|---|---|---|---|
| ex | 11 | 0 | 11 |
| friend | 11 | 0 | 11 |
| knows | 6 | 0 | 6 |
| partner | 5 | 0 | 5 |
| fwb | 2 | 1 | 3 |
| date | 3 | 1 | 4 |
| crush | 1 | 1 | 2 |
| colleague | 2 | 0 | 2 |
| mentioned_with | 2 | 0 | 2 |
| affair | 0 | 1 | 1 |
| lover | 1 | 0 | 1 |
| **合计** | **44** | **3** | **47** |

### 实体表统计
- **总数**：105
- **重复实体**：0（按 lowercase name 检查）

### 核心关系网络（含时态）
- **Aidan**
  - current: friend(Phillip, Dex, Bob, Ray, Tee, ZZ)、crush(Dex)、date(Icky)、knows(Gary)
  - past: crush(Bob)
- **Phillip**
  - current: partner(ff, 锋锋)、ex(司徒, Tee)、fwb(颜鸣, owen)、knows(Dex)、friend(Zack, AGNOSIA)
  - past: fwb(Zack)、date(Zack)、affair(AGNOSIA)
- **Tee**
  - current: ex(Alex, Arthur, Icky, 榴莲, Phillip)、friend(大介, Aidan)、colleague(Gary)、knows(谢翔)
- **Arthur**
  - current: ex(Ethan, Tee, Bob)、knows(Icky)
- **Icky**
  - current: partner(黄坚)、ex(Tee)、date(Aidan)、knows(Arthur)
- **Zack**
  - current: friend(Mavis, Phillip)、date(阿林)
  - past: date(Phillip)、fwb(Phillip)

---

## 五、相关文件清单

| 文件 | 作用 |
|---|---|
| `app/api/darkroom/extract-relations/route.ts` | 单条记忆关系提取 API（支持 `is_current` 和 `crush`） |
| `scripts/extract-relations-from-memories.ts` | 历史记忆批量提取脚本 |
| `scripts/clean-entity-relations.ts` | 关系表清洗脚本（保留多重关系，统一方向） |
| `scripts/add-multiplex-relations.ts` | 手动添加指定多重关系 |
| `scripts/merge-duplicate-entities.ts` | 重复实体合并脚本 |
| `scripts/backfill-darkroom-relations.ts` | 旧对话 backfill 触发脚本 |
| `scripts/continue-darkroom-relations-backfill.ts` | backfill 循环脚本 |
| `scripts/reset-relationship-conversations.ts` | 关系相关对话重置脚本 |
| `scripts/correct-relations-manual.ts` | 手动单条关系类型修正脚本 |
| `app/api/darkroom/extract/route.ts` | 主提取 API（含 backfill 模式） |
| `lib/darkroom-memory.ts` | 实体/关系/记忆数据库操作 |
| `lib/darkroom-chat.ts` | 聊天逻辑 + 名字识别 + 测试 |
| `app/admin/darkroom/page.tsx` | Admin 界面 |
| `components/DarkroomChat.tsx` | 聊天组件 |
| `hooks/useDarkroomChat.ts` | 聊天 hook |

---

*本清单由 Claude 在 2026-06-21 生成，用于人工逐项检查。*
