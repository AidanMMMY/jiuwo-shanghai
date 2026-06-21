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
- **结果**：提取 139 条关系，最终清洗后 43 条
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
  - 注册 canonical 别名（Philip→Phillip、Aiden→Aidan、tee（老王）→Tee、阿远（Icky）→Icky）
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

---

## 二、待你检查 / 确认

### 1. affair 与 partner 的优先级
当前优先级把 `affair` 放在 `partner` 之前。因此 **Phillip - AGNOSIA** 最终保留了 `affair` 而不是 `partner`。

- 如果同意：保持现状
- 如果调整：改为 `partner > affair`，需要再跑一次 `clean-entity-relations.ts`

### 2. 冲突解决结果抽查
以下是人对被压缩为单一关系后的结果，请确认是否符合记忆：

| 人物对 | 保留关系 | 被合并的关系 |
|---|---|---|
| Aidan - Phillip | partner | knows / friend / mentioned_with |
| Phillip - AGNOSIA | affair | fwb / date / knows / partner |
| Arthur - Ethan | ex | friend / partner |
| Tee - Arthur | ex | partner |
| Zack - Phillip | fwb | date / friend |
| D.F - David | partner | lover |
| Aidan - Dex | lover | knows |
| Aidan - Bob | lover | mentioned_with |

### 3. 是否 push
当前本地有两个 commit 未 push：
- `3895c33` feat(darkroom): clean entity relations - unify direction and resolve conflicts
- 更早的 `06946ac`（normalizeEntityName）

如需 push，请明确说 push。

---

## 三、可选下一步

### 1. 清理非人占位符实体
entities 表中仍存在早期提取错误的占位符，例如：
- 疑问碎片：`这个目标是谁`、`是谁`、`我是什`
- 关系角色占位符：`男朋友`、`约会对象`、`男性朋友`、`当前伴侣`、`长期男友`、`现任男友`
- 泛化指代：`用户`、`一位用户`、`某位顾客`

清理后 entities 表会更干净，但不会改变当前 43 条关系。

### 2. 从 conversation 重新提取关系
当前 43 条关系主要来自 memory-based 提取。可以重新打开 conversation backfill，让 `/api/darkroom/extract` 的 batchPrompt 也输出关系，补充可能遗漏的线索。

### 3. 给关系增加证据来源
当前 `evidence_memory_id` 在清洗过程中已保留，但部分关系证据为空。可以后续补全 evidence 或 confidence 评分机制。

### 4. 在 Admin 界面展示关系图
当前 admin 只显示实体列表，没有可视化关系网络。可以添加一个关系表格或简单图视图。

---

## 四、当前关键数据

### 关系表统计
- **总数**：43 条
- **方向统一**：`entity_a_id <= entity_b_id`，无反向重复
- **关系类型分布**：
  - ex: 13
  - partner: 7
  - friend: 6
  - knows: 5
  - fwb: 3
  - lover: 2
  - date: 2
  - affair: 1
  - colleague: 2
  - mentioned_with: 2

### 实体表统计
- **总数**：105
- **重复实体**：0（按 lowercase name 检查）

### 核心关系网络
- **Aidan**：partner(Phillip)、lover(Dex, Bob)、friend(Ray, Tee, ZZ)、date(Icky)、knows(Gary)
- **Phillip**：partner(ff, 锋锋, Aidan)、ex(司徒, Tee)、fwb(Zack, 颜鸣, owen)、affair(AGNOSIA)、knows(Dex)
- **Tee**：ex(Alex, Arthur, Icky, 榴莲, Phillip)、friend(大介, Aidan)、colleague(Gary)、knows(谢翔)
- **Arthur**：ex(Ethan, Tee, Bob)、knows(Icky)
- **Icky**：partner(黄坚)、ex(Tee)、date(Aidan)、knows(Arthur)

---

## 五、相关文件清单

| 文件 | 作用 |
|---|---|
| `app/api/darkroom/extract-relations/route.ts` | 单条记忆关系提取 API |
| `scripts/extract-relations-from-memories.ts` | 历史记忆批量提取脚本 |
| `scripts/clean-entity-relations.ts` | 关系表清洗脚本（方向 + 冲突） |
| `scripts/merge-duplicate-entities.ts` | 重复实体合并脚本 |
| `scripts/backfill-darkroom-relations.ts` | 旧对话 backfill 触发脚本 |
| `scripts/continue-darkroom-relations-backfill.ts` | backfill 循环脚本 |
| `scripts/reset-relationship-conversations.ts` | 关系相关对话重置脚本 |
| `app/api/darkroom/extract/route.ts` | 主提取 API（含 backfill 模式） |
| `lib/darkroom-memory.ts` | 实体/关系/记忆数据库操作 |
| `lib/darkroom-chat.ts` | 聊天逻辑 + 名字识别 + 测试 |
| `app/admin/darkroom/page.tsx` | Admin 界面 |
| `components/DarkroomChat.tsx` | 聊天组件 |
| `hooks/useDarkroomChat.ts` | 聊天 hook |

---

*本清单由 Claude 在 2026-06-21 生成，用于人工逐项检查。*
