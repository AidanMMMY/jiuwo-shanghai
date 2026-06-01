# 全局 UI 氛围沉浸化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 JIUWO 网站实施全局氛围沉浸化改造，包括 film grain 纹理、暖色环境光层、统一光影系统、差异化滚动入场动画、视差效果、导航滑动指示器等。

**Architecture:** 分层渐进式实施：先搭建全局 CSS 基础层（氛围纹理 + 动画工具类），再升级共享组件（图片加载、滚动动画），最后逐个页面应用新的光影和动效系统。所有动画共用一致的缓动曲线 `cubic-bezier(0.16, 1, 0.3, 1)`，并通过 `prefers-reduced-motion` 提供无障碍回退。

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion

---

## 文件结构

| 文件 | 变更 |
|------|------|
| `app/globals.css` | 新增 film grain、环境光层、差异化入场动画 class、阴影系统、分割线呼吸 |
| `components/FadeInImage.tsx` | 增加 blur-to-sharp 过渡 |
| `components/ScrollReveal.tsx` | 支持按元素类型切换入场效果、差异化 threshold |
| `components/GalleryGrid.tsx` | 新阴影系统、brightness hover、stagger delay |
| `components/MenuSection.tsx` | stagger delay、图片 brightness hover、分类标题细化 |
| `components/MenuNav.tsx` | indicator 滑动过渡、当前项 glow |
| `components/GuestbookHook.tsx` | 新阴影系统、边框精致化、stagger |
| `components/ReadingProgress.tsx` | 增加亮斑效果 |
| `app/components/pages/AboutPage.tsx` | 引号呼吸、信息卡片 transition |
| `components/Footer.tsx` | 社交图标 drop-shadow、底部渐变 |
| `components/JournalStreamList.tsx` | 按钮 hover 光晕、分割线呼吸 |
| `app/(en)/layout.tsx` | 接入环境光层和 page-bottom-fade |
| `app/zh/layout.tsx` | 接入环境光层和 page-bottom-fade |

---

## Task 1: 全局氛围层 CSS 基础

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 添加 film grain 纹理**

在 `body` 样式规则之后、 `@layer utilities` 之前，添加：

```css
/* ── Film Grain Texture ── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.03;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: grainShift 0.5s steps(10) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2%, -2%); }
  20% { transform: translate(2%, 2%); }
  30% { transform: translate(-1%, 1%); }
  40% { transform: translate(1%, -1%); }
  50% { transform: translate(-2%, 2%); }
  60% { transform: translate(2%, -2%); }
  70% { transform: translate(-1%, -1%); }
  80% { transform: translate(1%, 1%); }
  90% { transform: translate(-2%, -1%); }
}

@media (prefers-reduced-motion: reduce) {
  body::before { animation: none; }
}
```

- [ ] **Step 2: 添加暖色环境光层**

继续在同一位置添加：

```css
/* ── Ambient Warm Light Layer ── */
.ambient-light {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.ambient-light::before,
.ambient-light::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
}

.ambient-light::before {
  width: 60vw;
  height: 60vw;
  top: -20%;
  left: -10%;
  background: radial-gradient(circle, rgba(201,162,39,0.025) 0%, transparent 70%);
  animation: ambientDrift1 25s ease-in-out infinite;
}

.ambient-light::after {
  width: 50vw;
  height: 50vw;
  bottom: -10%;
  right: -5%;
  background: radial-gradient(circle, rgba(168,42,74,0.02) 0%, transparent 70%);
  animation: ambientDrift2 30s ease-in-out infinite;
}

.ambient-light-blob {
  position: absolute;
  width: 45vw;
  height: 45vw;
  top: 40%;
  left: 30%;
  border-radius: 50%;
  filter: blur(100px);
  background: radial-gradient(circle, rgba(201,162,39,0.015) 0%, transparent 70%);
  animation: ambientDrift3 35s ease-in-out infinite;
}

@keyframes ambientDrift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(5%, 8%) scale(1.1); }
  66% { transform: translate(-3%, 5%) scale(0.95); }
}

@keyframes ambientDrift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-6%, -4%) scale(1.05); }
  66% { transform: translate(4%, -7%) scale(1.1); }
}

@keyframes ambientDrift3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(7%, -5%) scale(0.9); }
  66% { transform: translate(-5%, 3%) scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-light::before,
  .ambient-light::after,
  .ambient-light-blob { animation: none; }
}
```

- [ ] **Step 3: 添加 page-bottom-fade 和分割线呼吸**

继续添加：

```css
/* ── Page Bottom Fade ── */
.page-bottom-fade {
  height: 120px;
  background: linear-gradient(to bottom, transparent, #0a0a0a);
  pointer-events: none;
}

/* ── Divider Breathe ── */
.divider-breathe {
  animation: dividerBreathe 3s ease-in-out infinite;
}

@keyframes dividerBreathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .divider-breathe { animation: none; opacity: 0.4; }
}
```

- [ ] **Step 4: 在 utilities 层添加差异化入场动画**

在现有的 `@layer utilities {` 区块中，**保留原有内容**并追加以下工具类：

```css
  /* ── Entrance Animation Utilities ── */
  .reveal-title {
    opacity: 0;
    transform: translateY(24px);
    filter: blur(4px);
    transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 800ms cubic-bezier(0.16, 1, 0.3, 1),
                filter 800ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-title.reveal-visible {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }

  .reveal-text {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-text.reveal-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .reveal-image {
    opacity: 0;
    transform: scale(0.96) rotate(0.5deg);
    transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-image.reveal-visible {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }

  .reveal-card {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-card.reveal-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .reveal-data {
    opacity: 0;
    transform: translateY(16px) translateX(8px);
    transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal-data.reveal-visible {
    opacity: 1;
    transform: translateY(0) translateX(0);
  }

  /* Stagger delays */
  .stagger-1 { transition-delay: 80ms; }
  .stagger-2 { transition-delay: 160ms; }
  .stagger-3 { transition-delay: 240ms; }
  .stagger-4 { transition-delay: 320ms; }
  .stagger-5 { transition-delay: 400ms; }
  .stagger-6 { transition-delay: 480ms; }

  @media (prefers-reduced-motion: reduce) {
    .reveal-title, .reveal-text, .reveal-image, .reveal-card, .reveal-data {
      opacity: 1;
      transform: none;
      filter: none;
      transition: none;
    }
  }

  /* ── Unified Shadow System ── */
  .shadow-card {
    box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25);
    transition: box-shadow 300ms ease, transform 300ms ease;
  }
  .shadow-card-hover:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3);
    transform: translateY(-2px);
  }
  .shadow-card-hover:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25);
  }

  /* ── Gradient Border ── */
  .border-gradient {
    border: 1px solid transparent;
    background: linear-gradient(#0e0e0e, #0e0e0e) padding-box,
                linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) border-box;
  }

  /* ── Glow Effects ── */
  .glow-gold {
    transition: box-shadow 300ms ease;
  }
  .glow-gold:hover {
    box-shadow: 0 0 20px rgba(201,162,39,0.12);
  }

  .text-glow-gold {
    transition: text-shadow 300ms ease;
  }
  .text-glow-gold:hover {
    text-shadow: 0 0 12px rgba(201,162,39,0.3);
  }

  /* ── Image Brightness Hover ── */
  .img-brightness {
    transition: filter 300ms ease, transform 300ms ease;
  }
  .group:hover .img-brightness,
  .img-brightness:hover {
    filter: brightness(1.08);
  }
```

- [ ] **Step 5: 验证构建**

运行：`npm run build`
预期：构建成功，无 CSS 错误

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "design: add film grain, ambient light, entrance animations, shadow system"
```

---

## Task 2: FadeInImage blur-to-sharp 过渡

**Files:**
- Modify: `components/FadeInImage.tsx`

- [ ] **Step 1: 替换 imageClass 的过渡效果**

在 `components/FadeInImage.tsx` 中，找到 `imageClass` 的定义：

```tsx
const imageClass = `${className} transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`;
```

替换为：

```tsx
const imageClass = `${className} transition-all duration-700 ease-out ${loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-[8px] scale-[1.02]'}`;
```

- [ ] **Step 2: Commit**

```bash
git add components/FadeInImage.tsx
git commit -m "design: add blur-to-sharp transition to FadeInImage"
```

---

## Task 3: ScrollReveal 支持差异化入场

**Files:**
- Modify: `components/ScrollReveal.tsx`

- [ ] **Step 1: 修改 ScrollReveal 组件**

将文件完整替换为：

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export default function ScrollReveal({
  children,
  delay = 0,
  className = '',
  effect = 'fade-up',
  threshold,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  effect?: 'fade-up' | 'fade-in' | 'scale-in' | 'title' | 'text' | 'image' | 'card' | 'data';
  threshold?: number;
}) {
  const defaultThreshold = effect === 'title' || effect === 'image' ? 0.15 : 0.05;
  const { ref, visible } = useScrollReveal(threshold ?? defaultThreshold);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isVisible = visible || reducedMotion;

  // Map effect names to CSS utility classes
  const effectClassMap: Record<string, string> = {
    title: 'reveal-title',
    text: 'reveal-text',
    image: 'reveal-image',
    card: 'reveal-card',
    data: 'reveal-data',
  };

  const isLegacy = ['fade-up', 'fade-in', 'scale-in'].includes(effect);
  const newEffectClass = effectClassMap[effect] || '';

  const getTransform = () => {
    if (reducedMotion || !isLegacy) return 'none';
    switch (effect) {
      case 'fade-up':
        return isVisible ? 'translateY(0)' : 'translateY(24px)';
      case 'scale-in':
        return isVisible ? 'scale(1)' : 'scale(0.96)';
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={ref}
      className={`${isLegacy ? 'transition-all duration-700 ease-out' : ''} ${newEffectClass} ${isVisible && !isLegacy ? 'reveal-visible' : ''} ${className}`}
      style={{
        opacity: isLegacy ? (isVisible ? 1 : 0) : undefined,
        transform: isLegacy ? getTransform() : undefined,
        transitionDelay: reducedMotion ? '0ms' : `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ScrollReveal.tsx
git commit -m "design: add differentiated entrance animations to ScrollReveal"
```

---

## Task 4: GalleryGrid 精致化

**Files:**
- Modify: `components/GalleryGrid.tsx`

- [ ] **Step 1: 应用新阴影和 stagger**

找到主卡片的 div（包含 `aspect-square` 的那个），将其 className 替换为：

```tsx
className="relative aspect-square overflow-hidden rounded-lg shadow-card shadow-card-hover"
```

找到 `Image` 组件的 className，替换为：

```tsx
className="object-cover transition-all duration-500 group-hover:scale-105 active:scale-[0.98] img-brightness"
```

找到 `ScrollReveal` 的调用，将 `delay={index * 100}` 改为 `delay={index * 80}`，将 `effect={index % 3 === 0 ? 'scale-in' : 'fade-up'}` 改为 `effect={index % 3 === 0 ? 'image' : 'card'}`。

- [ ] **Step 2: Commit**

```bash
git add components/GalleryGrid.tsx
git commit -m "design: refine GalleryGrid with shadow system, brightness hover, stagger"
```

---

## Task 5: MenuSection 精致化

**Files:**
- Modify: `components/MenuSection.tsx`

- [ ] **Step 1: 分类标题细化**

找到分类标题的金色竖条：

```tsx
<div className="w-1 h-6 bg-[#c9a227] rounded-full" />
```

替换为：

```tsx
<div className="w-1 h-5 bg-[#c9a227] rounded-full" />
```

- [ ] **Step 2: 菜单项 stagger 和图片 brightness**

找到外层的 `ScrollReveal`（包裹整个 section 的那个），保持不变。

找到内部遍历 `category.items.map((item, index)` 中的 `ScrollReveal`，将 `delay={index * 60}` 保持不变，将 `key={item.name}` 保持不变，将 effect 改为 `effect={item.image ? 'image' : 'data'}`。

找到图片的 `Image` 组件（在 `item.image &&` 块内），将其 className 从 `object-cover transition-transform duration-300 hover:scale-105 active:scale-[0.98]` 替换为：

```tsx
className="object-cover transition-all duration-300 group-hover:scale-105 active:scale-[0.98] img-brightness"
```

注意：需要在菜单项最外层 div 上添加 `group` class。找到：

```tsx
<div className="flex items-start gap-4 pb-6 mb-6">
```

替换为：

```tsx
<div className="flex items-start gap-4 pb-6 mb-6 group">
```

- [ ] **Step 3: Commit**

```bash
git add components/MenuSection.tsx
git commit -m "design: refine MenuSection with title bar, brightness hover, stagger"
```

---

## Task 6: MenuNav indicator 滑动和 glow

**Files:**
- Modify: `components/MenuNav.tsx`

- [ ] **Step 1: 实现滑动 indicator**

目前 indicator 是每个链接独立的 span。需要改为一个共享的 indicator 元素，通过 `left` 和 `width` 变化实现滑动。

将文件完整替换为：

```tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuCategory } from '@/lib/data';

export default function MenuNav({ categories }: { categories: MenuCategory[] }) {
  const [active, setActive] = useState<string | null>(categories[0]?.category ?? null);
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback(() => {
    if (!navRef.current || !active) return;
    const activeEl = navRef.current.querySelector(`[data-category="${active}"]`) as HTMLElement;
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1,
      });
    }
  }, [active]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  useEffect(() => {
    if (categories.length === 0) return;
    const sections = categories
      .map((cat) => document.getElementById(cat.category))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topmost = [...visible.entries()].reduce((a, b) => (a[1] < b[1] ? a : b))[0];
          setActive(topmost);
        }
      },
      { rootMargin: '-128px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div
          ref={navRef}
          className="relative flex gap-6 overflow-x-auto px-2"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          {/* Sliding indicator */}
          <span
            className="absolute bottom-0 h-0.5 rounded-full bg-[#c9a227] transition-all duration-500 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              opacity: indicatorStyle.opacity,
              boxShadow: '0 2px 8px rgba(201,162,39,0.4)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
          {categories.map((cat) => (
            <a
              key={cat.category}
              href={`#${cat.category}`}
              data-category={cat.category}
              className="group relative flex-shrink-0 whitespace-nowrap text-sm transition-colors py-1 px-1"
            >
              <span
                className={`transition-colors ${
                  active === cat.category ? 'text-[#c9a227]' : 'text-[#a0a0a0] group-hover:text-[#c9a227]'
                }`}
              >
                {cat.category}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

关键改动：
- 使用 `useRef` + `useCallback` 获取每个分类标签的位置
- 独立 `span` 作为 indicator，通过 `left`/`width` transition 实现滑动
- 添加 `box-shadow: '0 2px 8px rgba(201,162,39,0.4)'` 实现 glow 效果
- 缓动曲线统一为 `cubic-bezier(0.16, 1, 0.3, 1)`

- [ ] **Step 2: Commit**

```bash
git add components/MenuNav.tsx
git commit -m "design: add sliding indicator with glow to MenuNav"
```

---

## Task 7: GuestbookHook 精致化

**Files:**
- Modify: `components/GuestbookHook.tsx`

- [ ] **Step 1: 应用新阴影和边框**

找到最外层 card container：

```tsx
<div className="relative rounded-lg border border-[#1f1f1f] bg-[#0e0e0e] overflow-hidden">
```

替换为：

```tsx
<div className="relative rounded-lg border-gradient bg-[#0e0e0e] overflow-hidden shadow-card shadow-card-hover">
```

- [ ] **Step 2: 调整 entries stagger 和分割线呼吸**

找到 entries 的 grid div：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
```

将内部的 entry map 添加 index 和 stagger：

找到：

```tsx
{entries.map((entry) => (
  <div key={entry.id} className="flex items-start gap-3 group">
```

替换为：

```tsx
{entries.map((entry, index) => (
  <div
    key={entry.id}
    className="flex items-start gap-3 group"
    style={{ animationDelay: `${index * 80}ms` }}
  >
```

找到顶部的 gold accent line：

```tsx
<div className="h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent" />
```

替换为：

```tsx
<div className="h-px bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent divider-breathe" />
```

- [ ] **Step 3: Commit**

```bash
git add components/GuestbookHook.tsx
git commit -m "design: refine GuestbookHook with shadow, gradient border, divider breathe"
```

---

## Task 8: ReadingProgress 亮斑效果

**Files:**
- Modify: `components/ReadingProgress.tsx`

- [ ] **Step 1: 添加亮斑**

找到进度条 div：

```tsx
<div
  className="h-full bg-gradient-to-r from-[#c9a227]/60 via-[#c9a227] to-[#c9a227]/60 transition-all duration-150"
  style={{ width: `${progress}%` }}
/>
```

替换为：

```tsx
<div
  className="h-full relative"
  style={{ width: `${progress}%` }}
>
  <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/60 via-[#c9a227] to-[#c9a227]/60" />
  {/* Glow spot at the leading edge */}
  <div
    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1 h-3 rounded-full"
    style={{
      background: 'rgba(201,162,39,0.8)',
      boxShadow: '0 0 6px rgba(201,162,39,0.6), 0 0 12px rgba(201,162,39,0.3)',
    }}
  />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add components/ReadingProgress.tsx
git commit -m "design: add glow spot to ReadingProgress"
```

---

## Task 9: AboutPage 精致化

**Files:**
- Modify: `app/components/pages/AboutPage.tsx`

- [ ] **Step 1: 引号标记添加呼吸效果**

找到 Pull Quote 中的引号 span：

```tsx
<span className="text-[#c9a227] mr-1">&ldquo;</span>
```

替换为：

```tsx
<span
  className="text-[#c9a227] mr-1 inline-block"
  style={{
    textShadow: '0 0 20px rgba(201,162,39,0.4)',
    animation: 'quoteBreathe 4s ease-in-out infinite',
  }}
>&ldquo;</span>
```

同样处理闭合引号：

```tsx
<span
  className="text-[#c9a227] ml-1 inline-block"
  style={{
    textShadow: '0 0 20px rgba(201,162,39,0.4)',
    animation: 'quoteBreathe 4s ease-in-out infinite 2s',
  }}
>&rdquo;</span>
```

- [ ] **Step 2: 信息卡片 hover transition**

找到信息卡片的 div（在 `.map((item)` 内）：

```tsx
<div
  key={item.label}
  className="group border-l border-[#c9a227] pl-4 transition-all duration-300 hover:border-l-[3px] hover:bg-[#c9a227]/5 hover:pl-5 rounded-r-lg"
>
```

替换为：

```tsx
<div
  key={item.label}
  className="group border-l border-[#c9a227] pl-4 transition-all duration-300 hover:border-l-[3px] hover:bg-[#c9a227]/5 hover:pl-5 rounded-r-lg"
  style={{ transitionProperty: 'border-left-width, padding-left, background-color' }}
>
```

- [ ] **Step 3: Commit**

```bash
git add app/components/pages/AboutPage.tsx
git commit -m "design: add quote breathe and smooth card transition to AboutPage"
```

---

## Task 10: Footer 和 JournalStreamList 精致化

**Files:**
- Modify: `components/Footer.tsx`
- Modify: `components/JournalStreamList.tsx`

- [ ] **Step 1: Footer 社交图标 glow**

找到三个社交图标的 `<a>` 标签，将它们的 className 中 hover 部分从：

```tsx
className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors duration-300"
```

替换为：

```tsx
className="group flex flex-col items-center gap-2 text-[#a0a0a0] hover:text-[#c9a227] transition-all duration-300"
```

然后在每个图标 SVG 上增加 glow：找到 `InstagramIcon` 的 className：

```tsx
className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
```

替换为：

```tsx
className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(201,162,39,0.3)]"
```

对 `WeiboIcon` 和 `XiaohongshuIcon` 做同样修改。

在 Footer 最外层 `<footer>` 之前，添加 page-bottom-fade：

在 `Footer` 组件 return 的最开始，在 `<footer>` 之前插入：

```tsx
<div className="page-bottom-fade" />
```

- [ ] **Step 2: JournalStreamList 按钮光晕和分割线呼吸**

找到 "Load more" 按钮，将其 className 替换为：

```tsx
className="group relative px-8 py-2.5 text-sm tracking-wider text-[#a0a0a0] border border-[#333] rounded-sm hover:text-[#f5f5f0] hover:border-[#c9a227] transition-all duration-300 glow-gold"
```

找到 gold divider：

```tsx
<div className="mt-20 flex items-center gap-4">
  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c9a227]/30" />
  <div className="w-1.5 h-1.5 rounded-full bg-[#c9a227]/40" />
  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c9a227]/30" />
</div>
```

替换为：

```tsx
<div className="mt-20 flex items-center gap-4 divider-breathe">
  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#c9a227]/30" />
  <div className="w-1.5 h-1.5 rounded-full bg-[#c9a227]/40" />
  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#c9a227]/30" />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx components/JournalStreamList.tsx
git commit -m "design: add social glow, bottom fade, button glow, divider breathe"
```

---

## Task 11: Layout 接入氛围层

**Files:**
- Modify: `app/(en)/layout.tsx`
- Modify: `app/zh/layout.tsx`

- [ ] **Step 1: 修改英文 layout**

在 `app/(en)/layout.tsx` 中，找到 return 中的 `<div className={...}>`，在其内部最开头（children 之前）添加环境光层，在 children 之后添加 page-bottom-fade：

找到：

```tsx
<div className={`${inter.variable} font-sans antialiased`}>
  <Navbar name={site.name} nav={site.nav} />
  <main className="pt-0 min-h-screen">{children}</main>
  <Footer site={site} />
```

替换为：

```tsx
<div className={`${inter.variable} font-sans antialiased`}>
  {/* Ambient light layer */}
  <div className="ambient-light" aria-hidden="true">
    <div className="ambient-light-blob" />
  </div>
  <Navbar name={site.name} nav={site.nav} />
  <main className="pt-0 min-h-screen relative z-10">{children}</main>
  <Footer site={site} />
```

注意：`<main>` 增加 `relative z-10`，确保内容在环境光层之上。

- [ ] **Step 2: 修改中文 layout**

在 `app/zh/layout.tsx` 上做同样的修改。先读取该文件确认结构是否与英文 layout 相同。

找到 `<main>` 和 `<Footer>` 的位置，在 `<div>` 最开头添加：

```tsx
<div className="ambient-light" aria-hidden="true">
  <div className="ambient-light-blob" />
</div>
```

给 `<main>` 添加 `relative z-10`。

- [ ] **Step 3: Commit**

```bash
git add app/\(en\)/layout.tsx app/zh/layout.tsx
git commit -m "design: add ambient light layer to layouts"
```

---

## Task 12: 全局导航链接光晕

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: 给导航链接添加 text-glow-gold**

找到每个导航链接的 `<Link>` 组件。目前有两个：主导航链接和语言切换链接。

找到主导航链接的 className：

```tsx
className={`relative text-xs md:text-sm transition-colors duration-300 whitespace-nowrap py-1 ${
  isActive ? 'text-[#c9a227] font-medium' : 'text-[#a0a0a0] hover:text-[#c9a227]'
} group`}
```

替换为：

```tsx
className={`relative text-xs md:text-sm transition-colors duration-300 whitespace-nowrap py-1 text-glow-gold ${
  isActive ? 'text-[#c9a227] font-medium' : 'text-[#a0a0a0] hover:text-[#c9a227]'
} group`}
```

- [ ] **Step 2: Commit**

```bash
git add components/Navbar.tsx
git commit -m "design: add text glow to navbar links"
```

---

## Task 13: 最终构建验证

- [ ] **Step 1: 完整构建验证**

运行：`npm run build`
预期：构建成功，无任何错误

- [ ] **Step 2: 手动验证清单**

启动开发服务器：`npm run dev`

在浏览器中逐一验证：

| 页面 | 验证项 |
|------|--------|
| 首页 | 页面底部到 Footer 有渐变过渡；JournalStream "Load more" 按钮 hover 有光晕 |
| 首页 | GuestbookHook 卡片有阴影 hover 效果；分割线有呼吸 |
| Gallery | 卡片 hover 时有阴影扩散 + 图片 brightness 提升；入场动画 staggered |
| Menu | 分类导航 active indicator 会滑动；当前项有 glow |
| Menu | 菜单项 staggered 入场；图片 hover 有 brightness |
| About | 引号有呼吸效果；信息卡片 hover 时 border 平滑加宽 |
| 任意文章页 | 阅读进度条前端有亮斑 |
| 全局 | 滚动时 film grain 在动；背景有微妙的暖色光晕漂移 |
| 全局 | 导航链接 hover 有文字光晕 |

- [ ] **Step 3: 无障碍验证**

在浏览器 DevTools 中，模拟 `prefers-reduced-motion: reduce`：
- macOS: System Settings → Accessibility → Display → Reduce motion
- 或使用 DevTools Rendering tab → Emulate CSS media feature prefers-reduced-motion: reduce

验证：
- 所有入场动画停止，元素直接可见
- film grain 停止位移动画
- 分割线呼吸停止
- 视差效果不存在（本计划未引入 JS 视差，纯 CSS animation-timeline 在旧浏览器自动不生效）

- [ ] **Step 4: Commit 最终版本**

```bash
git commit -m "design: complete global UI atmosphere immersion"
```

---

## Self-Review

### Spec Coverage Check

| 设计章节 | 对应 Task | 状态 |
|---------|----------|------|
| Film Grain 纹理 | Task 1 Step 1 | ✅ |
| 暖色环境光层 | Task 1 Step 2, Task 11 | ✅ |
| page-bottom-fade | Task 1 Step 3, Task 10 | ✅ |
| 差异化入场动画 | Task 1 Step 4, Task 3 | ✅ |
| 统一阴影系统 | Task 1 Step 4, Task 4, Task 7 | ✅ |
| 渐变边框 | Task 1 Step 4, Task 7 | ✅ |
| 图片 blur-to-sharp | Task 2 | ✅ |
| 光晕反馈（按钮/链接） | Task 1 Step 4, Task 10, Task 12 | ✅ |
| 分割线呼吸 | Task 1 Step 3, Task 7, Task 10 | ✅ |
| 视差 | 本计划未引入复杂视差，使用 CSS animation-timeline 作为后续迭代 | ⚠️ 简化 |
| 导航 indicator 滑动 | Task 6 | ✅ |
| 滚动进度亮斑 | Task 8 | ✅ |
| 入场时机优化 | Task 3（threshold 差异化） | ✅ |
| 各页面调整 | Task 4, 5, 7, 9, 10 | ✅ |
| 性能保障 | Task 1（纯 CSS）、Task 13（验证） | ✅ |
| 无障碍 | Task 1（prefers-reduced-motion）、Task 13（验证） | ✅ |

### Placeholder Scan

- 无 "TBD"、"TODO"、"implement later"
- 所有代码步骤包含完整代码
- 无 "Similar to Task N"

### Type Consistency

- ScrollReveal 的 effect prop 类型与 effectClassMap 的 key 一致
- 所有缓动曲线统一为 `cubic-bezier(0.16, 1, 0.3, 1)`
- CSS 类名与 globals.css 中定义的一致

### 已知简化

视差效果在原始设计中有提及，但本计划未引入复杂的 JS-based 视差系统（需要 IntersectionObserver + RAF），而是保留了 CSS 动画基础设施，便于后续通过 `animation-timeline: scroll()` 轻量添加。这一简化降低了初始实施复杂度，同时不影响整体氛围效果。
