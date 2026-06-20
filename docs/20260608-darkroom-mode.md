# After Hours Darkroom 模式说明文档

> 更新日期：2026-06-08
> 对话：Dark Side

---

## 概述

After Hours Darkroom 是 JIUWO 网站的一个隐藏彩蛋模式。设计理念是「凌晨2点之后的 JIUWO」——灯关了，椅子翻上了，只有夜班的人还在。

**触发方式**：在首页点击左上角 Logo 5 次（1 秒内），切换进入/退出。

---

## 一、触发与状态机制

### 触发器

- **文件**：`components/Navbar.tsx`
- **条件**：仅在首页 (`/` 或 `/zh`) 点击左上角 Logo 时计数
- **逻辑**：1 秒内点击满 5 次触发切换；点不满则计数器归零
- **反馈**：每次点击有 100ms 的 `scale-110` 脉冲动画

### 状态切换

```tsx
const isDarkroom = document.body.classList.toggle('darkroom');
localStorage.setItem('jiuwo-darkroom', isDarkroom ? 'true' : 'false');
```

- 切换时产生白色全屏闪光（300ms 淡出）
- 进入时显示 4 秒渐显 intro 文字：
  > *"The lights are off. The chairs are up. This is JIUWO after 2am."*

### 状态恢复

页面加载时读取 `localStorage` 键 `jiuwo-darkroom`，自动恢复上次状态。这意味着用户一旦进入 darkroom，刷新或跳转页面都会保持。

### 关键设计决策

**无 React Context / 无状态管理库**。纯 DOM 操作（`document.body.classList.toggle`）+ CSS 全局覆盖。这是故意保持轻量的设计选择。

---

## 二、样式覆盖策略

全部定义在 `app/globals.css:626-764`。

| 覆盖目标 | 正常模式 | Darkroom 模式 |
|---------|---------|--------------|
| 背景色 | `#0a0a0a` | `#030303`（更黑） |
| 文字色 | `#f5f5f0` | `#e8e8d0`（偏黄白） |
| 品牌金 `#c9a227` | 金色 | `#a0a0a0`（灰色） |
| 图片 | 彩色 | `grayscale(100%) contrast(1.3)` |
| 字体 | 各组件自定义 | 全局强制等宽字体 Space Mono |
| 装饰光效 | 存在 | `opacity: 0` 隐藏 |
| 滚动条 | 默认 | 2px 细灰条 |
| 卡片阴影 | 暖色调 | 冷白 + 深黑 |

**实现方式**：全部用 `body.darkroom *` 选择器暴力覆盖，大量使用 `!important`。这是故意做成「一层滤镜」的感觉，而不是精心重新设计的主题。

---

## 三、组件层面的差异化

目前有两处组件做了 darkroom 专属内容：

### 1. Hero 标题切换

**文件**：`components/HeroCarousel.tsx:68-73`

```tsx
<div className="hero-title-breathe hero-normal-title">
  <AnimatedTitle text={title} />           {/* 正常模式 */}
</div>
<div className="hero-title-breathe hero-darkroom-title hidden">
  <AnimatedTitle text="JIUWO — After Hours" />  {/* Darkroom 模式 */}
</div>
```

两个 `<div>` 叠在一起，通过 CSS `display` 切换显示：
```css
body.darkroom .hero-normal-title { display: none !important; }
body.darkroom .hero-darkroom-title { display: flex !important; }
```

### 2. GuestbookHook 隐藏入口

**文件**：`components/GuestbookHook.tsx:82-94`

```tsx
<div className="darkroom-hidden text-center pb-6 hidden"
  data-zh="给夜班留句话"
  data-en="Leave a message for the night shift"
>
  <Link href={`${href}?write=1`}>
    <span>Leave a message for the night shift</span>
  </Link>
</div>
```

默认 `display: none`，darkroom 模式下 `display: block !important`。

**注意**：这两处都是硬编码在组件里的，不是从数据文件读取的。

---

## 四、数据层（JSON）现状

`lib/data.ts` 中所有类型定义——`SiteData`、`HeroSlide`、`JournalEntry`、`GalleryAlbum`、`MenuItem`、`AboutData`、`EventItem`——**没有任何 darkroom 相关字段**。

这意味着：目前 darkroom 模式**完全无法做内容差异化**。所有页面显示的内容和正常模式一模一样，只是视觉上被 CSS "洗"成了黑白灰。

---

## 五、内容差异化的可行方案

### 方案 A：轻量 — 组件层硬编码（现有模式）

适合少量、固定的彩蛋内容。实现方式：在正常内容旁边放一个 `.darkroom-only hidden`，CSS 控制显示/隐藏。

**优点**：零数据改造，改动范围小
**缺点**：内容写死在代码里，不能通过 `data/*.json` 维护

### 方案 B：中等 — JSON 加字段 + 条件渲染（推荐）

在数据类型里加入 `*Darkroom` 字段，组件根据 `document.body.classList.contains('darkroom')` 读取不同内容。

例如 `site.json`：
```json
{
  "tagline": "A neighborhood bar in Shanghai",
  "taglineZh": "上海的一家社区小酒馆",
  "taglineDarkroom": "The bar is closed. The night is not.",
  "taglineDarkroomZh": "酒吧打烊了。夜晚还没有。"
}
```

**优点**：内容可由 JSON 维护，符合现有工作流
**缺点**：需要改造 `lib/data.ts` 的类型 + 每个想支持的组件

### 方案 C：完整 — Darkroom 作为独立「主题层」

把 darkroom 提升为一等公民：
- 提供 `useDarkroom()` hook（基于 `MutationObserver` 监听 body class 变化）
- 所有组件统一通过 hook 感知状态
- JSON 结构支持完整的 darkroom 变体（如整份 ghost menu、整段 after-hours story）

**优点**：最灵活，可以做出真正独立的内容体验
**缺点**：工程量大，和现在「轻量彩蛋」的定位可能不符

---

## 六、建议

1. **如果要加内容差异化** → 走 **方案 B**，在 JSON 里加 `*Darkroom` / `*DarkroomZh` 字段。这样可以通过 `data/*.json` 维护内容，不用每次改代码。

2. **保持「一层滤镜」的视觉风格** → 这是 darkroom 的灵魂。不要做成精心重新设计的主题，就保持这种「被夜色洗过一遍」的粗糙感。

3. **内容差异化方向**：
   - **About 的 story**：换一段「打烊后的故事」
   - **Menu**：加一栏只在 darkroom 显示的 "After Hours" 酒单
   - **Journal**：某几篇标记为 `darkroomOnly: true`，只在 darkroom 出现
   - **Guestbook**：扩展更多「夜班留言」的语境

---

## 相关文件索引

| 文件 | 职责 |
|------|------|
| `components/Navbar.tsx:17-78` | Logo 点击计数器 + toggleDarkroom + localStorage 恢复 |
| `components/HeroCarousel.tsx:68-73` | 标题切换（正常 / After Hours） |
| `components/GuestbookHook.tsx:82-94` | 隐藏入口「给夜班留句话」 |
| `app/globals.css:626-764` | Darkroom 全局样式覆盖 |
| `lib/data.ts` | 数据类型定义（目前无 darkroom 字段） |
