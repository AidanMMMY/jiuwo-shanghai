# Dark Side 对话 — 改动追踪文档

> 本文档随对话进展持续更新。所有关于 Darkroom（黑白彩蛋）模式的改动记录在此。
> 对话日期：2026-06-08 ~ 进行中

---

## 工作约定

- 所有改动基于 **After Hours Darkroom（黑白彩蛋）模式**
- 若改动会影响正常模式内容在彩蛋模式中的显示，需提示冲突并等待用户确认
- 详见：[darkroom-mode.md](darkroom-mode.md)

---

## 改动记录

### 2026-06-08 — Darkroom Tagline 差异化

**需求**：在 Darkroom 模式下显示不同的 tagline（中英文）。

**涉及文件**：
- `components/HeroCarousel.tsx` — 标题文本 + tagline 条件渲染 + CSS 切换规则

**实现方式**：
- 标题：硬编码从 `"JIUWO — After Hours"` 改为 `"JIUWO（啾喔）"`
- Tagline：采用与标题相同的条件渲染模式（双 `<p>` 叠放 + CSS `display` 切换）
  - 正常模式：显示 `site.tagline`（`hero-normal-tagline`）
  - Darkroom 模式：显示 `"The Other Side（另一面）"`（`hero-darkroom-tagline hidden`）
- CSS 切换规则内联在 `HeroCarousel.tsx` 的 `<style>` 标签中

**潜在冲突**（已评估）：
- 正常模式下两个 darkroom 元素均为 `hidden`，不影响显示 ✅
- 数据层（`site.json`、`lib/data.ts`）无变动 ✅
- Build 通过 ✅

**状态**：✅ 已完成

---

### 2026-06-09 — Darkroom 标题改为双行

**需求**：Darkroom 模式下标题改为两行，中英文分别显示不同内容，保留换行。

**涉及文件**：
- `components/HeroCarousel.tsx` — `AnimatedTitle` 组件 + darkroom 标题文本

**实现方式**：
- `AnimatedTitle` 组件支持 `\n` 换行符 → `<br />` 转换（`text.split('\n').map(...)`）
- Darkroom 标题根据 `isZh` 传递不同文本：
  - 英文：`"JIUWO\nAfter Hours"`
  - 中文：`"啾喔\n寅时"`

**潜在冲突**（已评估）：
- `AnimatedTitle` 被正常标题和 darkroom 标题共用，正常模式 `title` 不含 `\n`，不受影响 ✅
- Build 通过 ✅

**状态**：✅ 已完成

---

### 2026-06-09 — Darkroom 标题视觉：CRT + Glitch 冷白暗青

**需求**：借鉴黑镜科幻片风格，给 Darkroom 标题添加暗黑、神秘、不稳定感的视觉效果。

**设计过程**：
1. Visual Companion 探索了 3 种方向（Glitch / CRT / 信号衰减）
2. 用户倾向 CRT + Glitch 混合
3. 在冷峻色调中选择了「冷白 + 暗青」配色

**涉及文件**：
- `components/HeroCarousel.tsx` — darkroom 标题渲染结构改为独立 `<h1>` + `<span class="darkroom-cold-title">`
- `app/globals.css` — 添加 `.darkroom-cold-title` 样式 + glitch keyframe 动画

**实现方式**：
- 外层 `hero-title-breathe` 保留呼吸缩放动画（作用于容器）
- 内层 `<span class="darkroom-cold-title">` 承载 glitch 效果：
  - 主文字：`#d8e0e0` 冷白
  - `::before`：`rgba(140,180,180,0.5)` 冷白 glitch 层（上半部）
  - `::after`：`rgba(40,80,80,0.55)` 暗青 glitch 层（下半部）
  - `glitchShake`：随机瞬间抖动（2.5秒周期，仅15%时间点触发）
  - `glitchLayer1/2`：两层伪元素独立错位移动
- `prefers-reduced-motion` 媒体查询中禁用 glitch 动画

**潜在冲突**（已评估）：
- 只修改 `hero-darkroom-title` 内部结构，正常模式 `hero-normal-title` 完全不变 ✅
- CSS 规则全部以 `body.darkroom` 前缀限定 ✅
- Build 通过 ✅

**状态**：✅ 已完成

---

## 待办 / 想法池

- [x] Tagline 差异化实现（标题 → JIUWO（啾喔），tagline → The Other Side（另一面））
- [ ] About story 的 darkroom 版本
- [ ] Menu "After Hours" 幽灵酒单
- [ ] Journal `darkroomOnly` 标记支持
- [ ] Guestbook 夜班留言语境扩展
