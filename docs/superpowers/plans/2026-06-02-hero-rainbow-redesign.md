# Hero 区域重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Hero 区域的 "JIUWO" 标题替换为暗调彩虹色流动，底部文字替换为饮品图标行，并移除"Much More"的彩虹高亮。

**Architecture:** 所有改动集中在单个文件 `components/HeroCarousel.tsx`。CSS 动画通过组件内联 `<style>` 标签实现，SVG 图标直接内联在 JSX 中，不引入新依赖。

**Tech Stack:** Next.js 15, React, Tailwind CSS, CSS keyframe animations

---

## 文件结构

| 文件 | 变更 | 职责 |
|------|------|------|
| `components/HeroCarousel.tsx` | 修改 | Hero 轮播组件：彩虹标题、图标行、动画 |

---

## Task 1: 替换 JIUWO 标题为暗调彩虹渐变

**Files:**
- Modify: `components/HeroCarousel.tsx:173-192` (`.hero-title-shine` CSS)
- Modify: `components/HeroCarousel.tsx:164-167` (`heroTitleShine` keyframe)

- [ ] **Step 1: 替换 `.hero-title-shine` 的 CSS 渐变定义**

将 `.hero-title-shine` 的 `background-image` 从金色 shine 改为暗调彩虹：

```css
.hero-title-shine {
  display: inline-block;
  background-image: linear-gradient(105deg,
    #8B1A4F 0%,
    #C45A1A 17%,
    #C9A227 34%,
    #5A6B3A 51%,
    #1E4A6E 68%,
    #6B3A7A 85%,
    #8B1A4F 100%);
  background-size: 400% 100%;
  background-position: 0% 50%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation:
    titleEntrance 900ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both,
    heroTitleShine 12s linear 1.6s infinite;
}
```

注意：
- `background-size` 从 `250%` 改为 `400%`
- `background-position` 初始值从 `100% 0` 改为 `0% 50%`
- `animation` 中的 `heroTitleShine` 周期从 `4s` 改为 `12s`

- [ ] **Step 2: 更新 `heroTitleShine` keyframe**

```css
@keyframes heroTitleShine {
  0%   { background-position: 0% 50%; }
  100% { background-position: 400% 50%; }
}
```

- [ ] **Step 3: 更新 reduce-motion 媒体查询中的 `.hero-title-shine` 规则**

```css
@media (prefers-reduced-motion: reduce) {
  .hero-title-breathe { animation: none !important; }
  .hero-title-shine { animation: none !important; background-position: 0% 50%; opacity: 1; transform: none; }
  .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
  .scroll-hint { animation: none !important; }
}
```

- [ ] **Step 4: Commit**

```bash
git add components/HeroCarousel.tsx
git commit -m "design: replace gold title shine with dark rainbow gradient"
```

---

## Task 2: 移除彩虹文字相关代码

**Files:**
- Modify: `components/HeroCarousel.tsx:36-42` (`renderIntro` 函数)
- Modify: `components/HeroCarousel.tsx:94-102` (底部 intro JSX)
- Modify: `components/HeroCarousel.tsx:160-163` (`rainbowFlow` keyframe)
- Modify: `components/HeroCarousel.tsx:199-212` (`.rainbow-text` CSS 类)

- [ ] **Step 1: 移除 `renderIntro` 函数**

将：
```tsx
function renderIntro(text: string) {
  return text.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
    part.startsWith('[[') && part.endsWith(']]')
      ? <span key={i} className="rainbow-text">{part.slice(2, -2)}</span>
      : part
  );
}
```

替换为：
```tsx
function renderIntro(text: string) {
  return text.replace(/\[\[|\]\]/g, '');
}
```

注意：`renderIntro` 现在只做简单的字符串清理，移除 `[[` 和 `]]` 标记。这个函数将在 Task 3 中被完全移除，但现在先保留签名。

- [ ] **Step 2: 移除 `rainbowFlow` keyframe**

删除：
```css
@keyframes rainbowFlow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
```

- [ ] **Step 3: 移除 `.rainbow-text` CSS 类**

删除：
```css
.rainbow-text {
  font-weight: 600;
  background-image: linear-gradient(60deg,
    #ff3d6e 0%,  #ff8a2e 16%, #ffe14d 33%,
    #2ed47a 50%, #4fb3ff 66%, #b46cff 83%,
    #ff3d6e 100%);
  background-size: 300% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: rainbowFlow 10s linear infinite;
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.15);
}
```

- [ ] **Step 4: Commit**

```bash
git add components/HeroCarousel.tsx
git commit -m "refactor: remove rainbow-text and rainbowFlow from hero"
```

---

## Task 3: 替换底部文字为图标行

**Files:**
- Modify: `components/HeroCarousel.tsx:94-102` (底部 intro div)
- Modify: `components/HeroCarousel.tsx` (新增 SVG 图标)

- [ ] **Step 1: 在组件内添加 SVG 图标组件**

在 `AnimatedTitle` 组件之后、`HeroCarousel` 组件之前，添加四个 SVG 图标组件：

```tsx
function TeaIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14c0 3.3-2.7 6-6 6s-6-2.7-6-6V6h12v8z" />
      <path d="M8 6c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M14 20v4" />
      <path d="M10 24h8" />
    </svg>
  );
}

function WineIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4v6c0 2.2 1.8 4 4 4s4-1.8 4-4V4" />
      <path d="M14 14v8" />
      <path d="M10 22h8" />
    </svg>
  );
}

function ShakerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f5f5f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h10l2 4H7l2-4z" />
      <path d="M8 7l3 18h6l3-18" />
      <path d="M11 12h6" />
      <path d="M12 17h4" />
    </svg>
  );
}
```

- [ ] **Step 2: 替换底部 intro div 为图标行**

将现有的底部 intro div：
```tsx
{/* Intro */}
<div
  className="z-10 px-6 text-center"
  style={{ position: 'absolute', left: 0, right: 0, bottom: '4rem' }}
>
  <p className="hero-intro-fade-up text-base tracking-wide text-[#f5f5f0] md:text-lg lg:text-xl">
    {renderIntro(intro)}
  </p>
</div>
```

替换为：
```tsx
{/* Drink icons */}
<div
  className="z-10 px-6"
  style={{ position: 'absolute', left: 0, right: 0, bottom: '4rem' }}
>
  <div className="hero-intro-fade-up flex items-center justify-center gap-6">
    <TeaIcon />
    <WineIcon />
    <ShakerIcon />
    <span className="text-[#f5f5f0] text-lg tracking-widest">···</span>
  </div>
</div>
```

- [ ] **Step 3: 移除 `renderIntro` 函数（彻底清理）**

删除 `renderIntro` 函数定义。`intro` prop 仍然保留在组件签名中（TypeScript 类型兼容），但实际不再使用。后续可以考虑从调用方移除 `intro` prop 传递。

- [ ] **Step 4: Commit**

```bash
git add components/HeroCarousel.tsx
git commit -m "design: replace hero intro text with drink icon row"
```

---

## Task 4: 验证与清理

**Files:**
- Modify: `app/(en)/page.tsx` (可选：移除 `site.intro` 传递)
- Modify: `app/zh/page.tsx` (可选：移除 `site.intro` 传递)
- Modify: `app/components/pages/HomePage.tsx` (可选：移除 `intro` prop)

- [ ] **Step 1: 启动开发服务器并验证视觉效果**

```bash
npm run dev
```

打开 `http://localhost:3000`，验证：
1. JIUWO 标题显示暗调彩虹渐变（酒红→琥珀→金→橄榄→深蓝→深紫）
2. 彩虹流动动画平滑，周期约 12 秒
3. 底部显示 3 个图标 + 省略号，颜色为 off-white
4. 没有 "Tea, Wine, Cocktails, and MUCH MORE" 文字出现
5. "Much More" 不再有彩虹色
6. 入场动画正常（标题从下方淡入，图标行随后淡入）
7. 移动端和桌面端均正常

- [ ] **Step 2: 检查调用方是否仍可编译**

由于 `intro` prop 仍然保留在 `HeroCarousel` 的签名中（未被使用但类型允许），调用方不需要修改。不过为了清理，可以选择性移除 `intro` prop 的传递：

在 `app/components/pages/HomePage.tsx` 中：
```tsx
// 将
<HeroCarousel slides={slides} title={site.name} tagline={site.tagline} intro={site.intro} />
// 改为
<HeroCarousel slides={slides} title={site.name} tagline={site.tagline} intro={site.intro} />
```

实际上，为了保持向后兼容和避免不必要的改动，**建议暂时保留 `intro` prop**。后续如果需要完全移除，可以作为独立任务处理。

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "design: hero rainbow title + icon row — complete"
```

---

## 自审检查表

### Spec 覆盖检查

| Spec 要求 | 对应 Task / Step |
|-----------|-----------------|
| JIUWO 暗调彩虹渐变（酒红→琥珀→金→橄榄→深蓝→深紫） | Task 1, Step 1 |
| 彩虹流动动画 12s 周期 | Task 1, Step 2 |
| 保留入场动画和呼吸动画 | Task 1, Step 1 |
| 保留文字阴影确保可读性 | Task 1, Step 1（未改动） |
| 底部图标行（茶叶、红酒杯、摇酒壶、省略号） | Task 3, Step 1-2 |
| 图标风格：极简线条、off-white、28px | Task 3, Step 1-2 |
| 图标行入场动画保持 | Task 3, Step 2（复用 `hero-intro-fade-up`） |
| 移除 `.rainbow-text` 和 `rainbowFlow` | Task 2, Step 2-3 |
| 移除 `renderIntro` 彩虹解析 | Task 2, Step 1 |
| reduce-motion 无障碍处理 | Task 1, Step 3 |

### Placeholder 扫描

- [x] 无 TBD / TODO
- [x] 无 "appropriate error handling" 等模糊描述
- [x] 所有代码块包含完整实现
- [x] 无 "Similar to Task N" 引用

### 类型一致性

- [x] `HeroCarousel` 的 props 签名未改变（`intro` 仍接受），调用方无需修改
- [x] SVG 组件为无状态函数组件，无 props

---

## 回滚方案

如果实施后效果不理想，回滚步骤：

```bash
git revert HEAD~2..HEAD  # 回滚 Task 1-3 的3个 commit
```

或手动恢复：
1. 恢复 `.hero-title-shine` 的金色渐变（`#c9a227` → `#ffffff` → `#c9a227`）
2. 恢复 `heroTitleShine` keyframe 为 4s 周期
3. 恢复 `renderIntro` 函数和 `.rainbow-text` CSS
4. 恢复底部 intro 文字 div
