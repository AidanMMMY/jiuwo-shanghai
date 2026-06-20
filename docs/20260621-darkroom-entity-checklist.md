# Darkroom 人物档案改造检查清单

> 生成时间：2026-06-21
> 范围：当前数据库中已迁移/生成的实体、人物卡，以及需要你确认的信息

---

## 一、功能调整说明

### 1. 关系图新增 `lover`、`fwb`、`date`、`affair` 类型

**是否冲突？** 不冲突。关系类型在数据库中只是 `VARCHAR(32)` 字符串，新增类型不会影响已有数据或代码逻辑。

**是否合适？** 技术上完全可行，但属于高敏感度关系类型。建议：

- 把它们加入可选关系类型列表，让 LLM 在确实合适时使用
- 在展示人物卡时，`lover` / `fwb` / `date` / `affair` 与其他敏感关系一样，用模糊、八卦感的措辞，不直接贴标签
- 如果用户没有明确说「我们是恋人 / 我们是 fwb / 我们在约会 / 我们有私情」，不要让 LLM 主动推断为这类关系

当前已支持的关系类型：

```text
friend, partner, lover, fwb, date, affair, colleague, ex, sibling, knows, mentioned_with
```

### 2. 隐私与降级功能已暂时禁用

- 新增统一开关 `PRIVACY_FEATURES_ENABLED = false`（位于 `lib/darkroom-memory.ts`）
- 以下功能代码保留，但当前不会触发：
  - 聊天中的「忘了我 / 别提他了」检测与处理
  - 新 `user_mentioned` 实体不再自动写入 `privacy.ttl_days = 90`
  - `pruneExpiredEntityProfiles` 仍可被脚本手动调用，但不会被自动触发
- 需要启用时，把 `PRIVACY_FEATURES_ENABLED` 改为 `true` 即可

---

## 二、KNOWN_ENTITIES 当前清单

数据库中 `source = 'knowledge_base'` 的实体共 **11 个**：

| 规范名 | 别名 | 当前 profile.description | mention_count | 最近提及 |
|---|---|---|---|---|
| AGNOSIA | agnosia, 勺子 | 生而如此。Lady Gaga 的死忠粉，阳光帅气，是很多人眼中的天菜。 | 13 | 2026-06-20 |
| Aidan | aidan | 啾喔的核心面孔之一。与老板和常客都很熟。爱喝葡萄酒，喜欢霸占啾喔的音响放歌，对喜欢的人会忍不住动手动脚。与老王有互相爆料的制衡关系。 | 107 | 2026-06-20 |
| D.F | d.f, df, 豆腐 | 有他在，气氛永远在线。对朋友重情重义，注重自身形象，出场自带气场。 | 7 | 2026-06-20 |
| Dex | dex | 话不多，心很热。生活作息规律，不喜欢节奏被打破。Instagram: dex0912f。感情稳定长跑中，在店内与少数几人亲近。 | 47 | 2026-06-20 |
| Icky | icky, 阿远 | 腹有典籍，身有筋骨。精通汝瓷与茶文化，能从一只杯子的开片里讲出时间。小红书可追踪。 | 29 | 2026-06-20 |
| Josh_Hu | josh_hu, josh hu, josh, josh_hmy | 自带好心情的老朋友。Instagram: Josh_hmy，小红书。不管房间多吵，他一来气氛就稳了。 | 6 | 2026-06-20 |
| Morris | morris, 莫里斯 | 眼神锋利，笑却温柔。无论长发短发都很帅气，外形自带辨识度。 | 1 | 2026-06-20 |
| PP | pp, 鹏鹏 | 缺少此签名，周末协议不完整。小红书。有 PP 在的周末才完整。 | 0 | 2026-06-20 |
| Phillip | phillip, 小马, 马哥 | 又名小马、马哥。从陌生人变成了这里的老面孔，大概是啾喔最常来的客人之一。与很多常客关系都好，外形迷人，被不少人喜欢。 | 34 | 2026-06-20 |
| Tee | tee, 老王 | 又名老王。这家酒吧是他与 Gary 一起打理的地方。话不多，情绪稳定，被很多人喜欢。情史丰富，与 Aidan 有互相爆料的制衡关系。 | 49 | 2026-06-20 |
| Zack | zack, 扎克, 渣克 | 情感模块高温运行，每次输入都重新编译。Instagram: zack121391，小红书。会为日落、酒和人心动。嘴硬型选手，真相往往在逼问后才姗姗来迟。 | 21 | 2026-06-20 |

### 已完成的别名更新

- PP：新增「鹏鹏」
- Phillip：新增「马哥」
- Tee：保留「老王」（原本已有）
- Zack：新增「扎克」「渣克」

### 需要确认

- [x] 以上 11 个人的 `description` 已按普通版 Gallery 描述 + 聊天记忆重新整理
- [ ] 当前 description 是否准确、是否符合你希望他们被 AI 记住的方式
- [ ] 是否还需要补充其他别名
- [ ] PP 的 `mention_count = 0` 是因为数据库里之前没有提到过他；上线后若用户提到会自动增加

---

## 三、人物卡（Entity Profile）当前状态

当前数据库中有 **11 个实体有非空 profile**，全部是 `knowledge_base` 的已知人物。`user_mentioned` / `memory` 实体目前只有名字和关联记忆，没有 LLM 生成的 profile。

### 人物卡注入 prompt 的格式已扩展

`buildEntityCard`（`lib/darkroom-memory.ts`）现在会按顺序输出：

```text
[人物卡：小马]
- 身份：酒吧熟客，常与阿林一起来
- 已知事实：...；...；...
- 关系线索：...
- 关系：阿林（partner） · 2026-06-20、Dex（friend）
- 偏好：金汤力、吧台座位
- 近期记忆：
  - 上次和阿林一起来坐在吧台
```

新增内容：

- **已知事实**（`profile.known_facts`）
- **关系线索**（`profile.relationship_hints`）
- 无 description 的 `user_mentioned` / `memory` 实体会显示兜底说明：
  - `- 身份：从 7 条聊天记忆中识别出的人物`

### 需要确认

- [ ] 这些 description 作为「人物卡」注入 prompt 时，是否会让 AI 说出你希望它说的话
- [ ] 如果要让 `user_mentioned` / `memory` 实体也有丰满 profile，需要运行 `scripts/summarize-entity-profiles.ts`（需要 `DEEPSEEK_API_KEY`）

---

## 四、关系数据当前状态

- `darkroom_entity_relations` 表中当前关系数：**0**
- 原因：Phase 2 的新 extraction prompt 要求 LLM 返回 relations，但尚未部署上线；旧记忆提取时没有生成关系
- 部署上线后，新对话会开始产生关系记录

### 关系已支持 `date`、`affair`

关系表 `darkroom_entity_relations` 本身已有 `created_at`。人物卡显示关系时**不带日期**，仅显示关系类型。

新增关系类型：

- `date`：约会中 / 约会过
- `affair`：婚外情 / 外遇 / 私情

这两个类型与 `lover` / `fwb` 一样属于敏感关系，建议在展示时用模糊、八卦感的措辞，不直接贴标签。

### 需要确认

- [ ] 关系类型列表是否接受 `lover`、`fwb`、`date`、`affair`（已添加）
- [ ] 是否希望在 AI 回复中对 `lover` / `fwb` / `ex` / `partner` 等关系使用更隐晦/八卦的措辞（当前 prompt 已要求如此）

---

## 五、记忆关联当前状态

- `darkroom_memory_entities` 中共有 **151** 条记忆-实体关联
- 来源：Phase 1 迁移脚本扫描了全部记忆，把出现实体名字/别名的记忆关联为 `mentioned`
- 关联规则：如果记忆内容中出现了某个实体的名字或别名，就建立 `mentioned` 关系

### 抽查结果

最近 50 条关联总体合理，大部分人名都是因为用户主动询问或提到而被标记。例如：

| 时间 | 实体 | 记忆摘要 |
|---|---|---|
| 06-20 17:23 | Dex | 用户好奇 dex 和老王之间是否有好感及互动 |
| 06-20 17:23 | Tee, Josh_Hu | 用户询问 tee 与阿远、josh、榴莲、alex、arthur 之间的关系 |
| 06-20 17:22 | Aidan | 用户否认 Aidan 有偷窥癖的说法 |
| 06-20 17:21 | AGNOSIA | 用户询问常客'勺子'信息 |
| 06-20 17:21 | Dex, Aidan | Aidan 对 Dex 有感情投入，Reborn 多次接吻 |
| 06-20 17:20 | Tee, Zack, Icky, Aidan, Phillip, AGNOSIA | 用户梳理多位常客情感关系 |

### 需要注意的风险

- **同名混淆**：有几条记忆提到"一位名叫 Aidan 的用户"，可能是与 knowledge_base 的 Aidan 同名的其他客人，目前系统无法区分
- **否认/纠正类记忆**：比如"用户否认 Aidan 有偷窥癖"，这条记忆本身是被否认的内容，但仍被关联到了 Aidan

### 需要确认

- [ ] 抽查 `darkroom_memory_entities`，确认没有明显张冠李戴
- [ ] 例如：某条关于「小马」的记忆是否错误地关联到了「Aidan」
- [ ] 是否有记忆被关联到了非人物实体（如把「重庆森林」鸡尾酒关联到某个人）

---

## 六、隐私与降级功能当前状态

- **状态：已禁用**
- 开关：`PRIVACY_FEATURES_ENABLED = false`（`lib/darkroom-memory.ts`）
- 已保留的代码：
  - `detectForgetRequest`（识别遗忘指令）
  - `forgetEntity`（清除实体 profile 和关系）
  - `pruneExpiredEntityProfiles`（过期第三方档案清理）
  - chat route 中的遗忘请求处理路径

### 需要确认

- [ ] 暂时禁用是否符合预期
- [ ] 日后启用时，是否接受「软删除」方案：保留实体名字，但清空 profile 和关系

---

## 七、上线前建议测试项

- [ ] 中文：「小马最近怎样？」→ AI 应基于小马的人物卡/记忆回复
- [ ] 中文：「阿林和小马是什么关系？」→ 如果有关系数据，AI 应能回答；没有则应表示不知道
- [ ] 英文："Tell me about Tee" → AI 应识别 Tee/老王
- [ ] 测试关系提取：用户说「小马和阿林在约会」→ 部署后检查 `darkroom_entity_relations` 是否出现 `date` 关系
- [ ] 测试关系提取：用户说「小马和勺子有过一段私情」→ 部署后检查是否出现 `affair` 关系
- [ ] 确认无 description 的 `user_mentioned` 实体会显示「从 X 条聊天记忆中识别出的人物」
- [ ] 确认「忘了我」暂时不会触发任何清除操作（因为隐私功能已禁用）

---

## 八、修改后的文件

本次调整修改了以下文件：

- `app/api/darkroom/extract/route.ts` — 增加 `lover`、`fwb` 到有效关系类型
- `data/darkroom-messages-zh.json` / `data/darkroom-messages.json` — 更新 extraction prompt 中的关系类型说明
- `lib/darkroom-memory.ts` — 增加 `PRIVACY_FEATURES_ENABLED` 开关；upsertEntity 仅在开关开启时写入默认隐私 TTL；扩展 `buildEntityCard` 输出 known_facts、relationship_hints、无 description 实体的兜底提示
- `app/api/darkroom/chat/route.ts` — 遗忘请求处理仅在 `PRIVACY_FEATURES_ENABLED = true` 时生效
- `lib/darkroom-memory.test.ts` — 更新 `buildEntityCard` 测试，覆盖兜底提示
- `lib/darkroom.ts` — 更新 `KNOWN_ENTITIES` 的 hint 和别名

---

## 九、如何启用隐私功能（日后）

把 `lib/darkroom-memory.ts` 中的：

```ts
export const PRIVACY_FEATURES_ENABLED = false;
```

改为：

```ts
export const PRIVACY_FEATURES_ENABLED = true;
```

即可启用：

- 聊天中的「忘了我 / 别提他了」指令会真正清除对应实体信息
- 新 `user_mentioned` 实体会自动写入 90 天 TTL
- 可定期运行 `pruneExpiredEntityProfiles()` 清理过期档案

---

## 十、数据摘要

```text
实体总数：61
  - knowledge_base: 11
  - memory: 3
  - user_mentioned: 47

有 description 的实体：11（全部是 knowledge_base）
关系记录：0
记忆-实体关联：151
```

---

*本清单由 Claude 生成，建议人工抽查关键数据后再部署。*
