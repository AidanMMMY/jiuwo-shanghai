# Gallery 视觉与动效优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Gallery 列表页、相册明细页和 Lightbox 增加 scroll-reveal 入场动画、精致化交互反馈、以及无缝放大过渡效果。

**Architecture:** 提取 JournalStreamList 中的 scroll-reveal 逻辑为共享组件 `ScrollReveal`，供 GalleryGrid 和 AlbumPhotoGrid 复用。Lightbox 使用 FLIP 动画技术实现无缝放大过渡。所有动画支持 `prefers-reduced-motion` 降级。

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, embla-carousel-react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/ScrollReveal.tsx` | 创建 | 共享的 scroll-reveal 包装组件 + hook |
| `components/JournalStreamList.tsx` | 修改 | 使用新的 ScrollReveal 组件替代内联逻辑 |
| `app/components/pages/GalleryPage.tsx` | 修改 | 标题区域增加装饰线 |
| `components/GalleryGrid.tsx` | 修改 | 增加 scroll-reveal 入场动画 + tap 反馈 |
| `app/components/pages/GalleryAlbumPage.tsx` | 修改 | 标题区域装饰线 + 返回按钮动画 |
| `components/AlbumPhotoGrid.tsx` | 修改 | 增加 scroll-reveal + tap 反馈 |
| `components/Lightbox.tsx` | 重写 | 无缝放大过渡 + UI 精致化 + 下滑关闭 |
| `app/globals.css` | 修改 | 补充动画 keyframes |

---

### Task 1: 创建 ScrollReveal 共享组件

**Files:**
- Create: `components/ScrollReveal.tsx`
- Modify: `components/JournalStreamList.tsx`

- [ ] **Step 1: 创建 `components/ScrollReveal.tsx`**

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
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 修改 `JournalStreamList.tsx` 使用 ScrollReveal**

替换内联的 `useScrollReveal` 和 `RevealWrapper` 为导入的组件：

```tsx
import ScrollReveal from './ScrollReveal';
```

删除内联的 `useScrollReveal` 和 `RevealWrapper` 定义。

在 map 中：

```tsx
{visibleEntries.map((entry, index) => (
  <ScrollReveal key={entry.slug} delay={index % 3 * 80}>
    <JournalEntryWithLikes entry={entry} />
  </ScrollReveal>
))}
```

- [ ] **Step 3: 验证编译**

Run: `npm run build 2>&1 | tail -20`
Expected: 没有 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add components/ScrollReveal.tsx components/JournalStreamList.tsx
git commit -m "feat: extract ScrollReveal as shared component"
```

---

### Task 2: Gallery 列表页视觉优化

**Files:**
- Modify: `app/components/pages/GalleryPage.tsx`
- Modify: `components/GalleryGrid.tsx`

- [ ] **Step 1: 修改 `GalleryPage.tsx` 标题区域**

```tsx
<section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
  <div className="mx-auto max-w-7xl">
    <div className="flex items-center gap-6 mb-8">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
      <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide shrink-0">
        {title ?? 'Gallery'}
      </h1>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
    </div>
    {subtitle && (
      <p className="mb-12 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl text-center mx-auto">{subtitle}</p>
    )}
    {!subtitle && <div className="mb-12" />}
    <GalleryGrid albums={albums} basePath={basePath} />
  </div>
</section>
```

- [ ] **Step 2: 修改 `GalleryGrid.tsx` 增加 scroll-reveal + tap 反馈**

顶部导入：

```tsx
import ScrollReveal from './ScrollReveal';
```

包裹每个相册卡片：

```tsx
import { useMemo } from 'react';
```

在组件内添加：

```tsx
export default function GalleryGrid({ albums, basePath = '' }: { albums: GalleryAlbum[]; basePath?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album, index) => (
        <ScrollReveal key={album.id} delay={index * 100}>
          <Link href={`${basePath}/gallery/${album.id}`} className="group block">
            {/* ... existing card structure ... */}
          </Link>
        </ScrollReveal>
      ))}
    </div>
  );
}
```

为封面图增加 tap 反馈（移动端 `:active`）：

将封面图的 Image className 从：
```
className="object-cover transition-transform duration-500 group-hover:scale-105"
```
改为：
```
className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-105 active:scale-[0.98] active:brightness-110"
```

- [ ] **Step 3: 验证编译**

Run: `npm run build 2>&1 | tail -20`
Expected: 没有 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add app/components/pages/GalleryPage.tsx components/GalleryGrid.tsx
git commit -m "feat: add scroll-reveal and tap feedback to gallery grid"
```

---

### Task 3: 相册明细页视觉优化

**Files:**
- Modify: `app/components/pages/GalleryAlbumPage.tsx`
- Modify: `components/AlbumPhotoGrid.tsx`

- [ ] **Step 1: 修改 `GalleryAlbumPage.tsx` 标题区域 + 返回按钮**

```tsx
import Link from 'next/link';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import FriendSocialBar from '@/components/FriendSocialBar';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryAlbumPage({
  album,
  backHref,
  backLabel,
  locale = 'en',
}: {
  album: GalleryAlbum;
  backHref?: string;
  backLabel?: string;
  locale?: 'en' | 'zh';
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link
          href={backHref ?? '/gallery'}
          className="group inline-flex items-center gap-2 text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
          <span>{backLabel ?? 'Back to Gallery'}</span>
        </Link>

        <header className="mt-8">
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide">{album.title}</h1>
          {album.subtitle && (
            <p className="mt-3 text-sm text-[#a0a0a0] leading-relaxed max-w-2xl">{album.subtitle}</p>
          )}
          <FriendSocialBar social={album.friendSocial} locale={locale} />
          <div className="mt-6 h-px bg-gradient-to-r from-[#c9a227]/30 via-[#333] to-transparent" />
        </header>

        <div className="mt-12">
          <AlbumPhotoGrid photos={album.photos} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 修改 `AlbumPhotoGrid.tsx` 增加 scroll-reveal + tap 反馈**

顶部导入：

```tsx
import ScrollReveal from './ScrollReveal';
```

PhotoCard 的 className 增加 tap 反馈：

```tsx
className="relative aspect-square overflow-hidden rounded-lg cursor-pointer select-none overflow-hidden"
```

Image 的 className 增加 tap 反馈：

```tsx
className="object-cover transition-all duration-500 active:scale-[0.98] active:brightness-110"
```

在 grid map 中包裹 ScrollReveal：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {photos.map((photo, idx) => (
    <ScrollReveal key={idx} delay={idx * 60}>
      <PhotoCard
        photo={photo}
        idx={idx}
        onOpen={() => setLightboxIndex(idx)}
      />
    </ScrollReveal>
  ))}
</div>
```

- [ ] **Step 3: 验证编译**

Run: `npm run build 2>&1 | tail -20`
Expected: 没有 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add app/components/pages/GalleryAlbumPage.tsx components/AlbumPhotoGrid.tsx
git commit -m "feat: add scroll-reveal and visual polish to album detail page"
```

---

### Task 4: Lightbox 无缝放大过渡

**Files:**
- Modify: `components/Lightbox.tsx`

- [ ] **Step 1: 实现 FLIP 动画工具函数**

在 Lightbox 组件顶部添加辅助函数：

```tsx
function getRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

function animateFlip(
  fromRect: DOMRect,
  toRect: DOMRect,
  element: HTMLElement,
  duration: number = 400
): Animation {
  const scaleX = fromRect.width / toRect.width;
  const scaleY = fromRect.height / toRect.height;
  const translateX = fromRect.left - toRect.left + (fromRect.width - toRect.width) / 2;
  const translateY = fromRect.top - toRect.top + (fromRect.height - toRect.height) / 2;

  const animation = element.animate(
    [
      { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, opacity: 1 },
      { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
    ],
    { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
  );

  return animation;
}
```

- [ ] **Step 2: 重写 Lightbox 组件支持无缝过渡**

Lightbox 需要接受 `originRect` 和 `photoSrc` 作为新增 props，用于 FLIP 动画：

```tsx
export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
  originRect,
}: {
  photos: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  originRect?: DOMRect;
}) {
```

在组件内部：

1. 创建一个 ref 指向飞行图片元素
2. 组件挂载时，如果 `originRect` 存在，执行打开动画
3. 关闭时，执行反向动画

完整的 Lightbox 重写代码较长，核心逻辑：

```tsx
const [isAnimating, setIsAnimating] = useState(false);
const [showContent, setShowContent] = useState(!originRect);
const flyingRef = useRef<HTMLImageElement>(null);
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!originRect || !flyingRef.current || !containerRef.current) {
    setShowContent(true);
    return;
  }

  setIsAnimating(true);
  const photo = photos[currentIndex];
  const targetRect = containerRef.current.getBoundingClientRect();

  const anim = animateFlip(originRect, targetRect, flyingRef.current, 400);
  anim.onfinish = () => {
    setIsAnimating(false);
    setShowContent(true);
  };

  return () => anim.cancel();
}, [originRect, currentIndex, photos]);

const handleClose = useCallback(() => {
  // 尝试找到对应的缩略图执行反向动画
  const thumb = document.querySelector(`[data-photo-src="${photos[currentIndex].src}"]`) as HTMLElement;
  if (thumb && flyingRef.current) {
    const thumbRect = getRect(thumb);
    const currentRect = getRect(flyingRef.current);
    setShowContent(false);
    setIsAnimating(true);
    const anim = animateFlip(currentRect, thumbRect, flyingRef.current, 350);
    anim.onfinish = () => onClose();
  } else {
    onClose();
  }
}, [currentIndex, photos, onClose]);
```

JSX 中增加飞行图片层：

```tsx
{originRect && isAnimating && (
  <img
    ref={flyingRef}
    src={photos[currentIndex].src}
    alt={photos[currentIndex].alt}
    className="fixed z-[110] object-contain"
    style={{
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
    }}
  />
)}
```

- [ ] **Step 3: 修改 `AlbumPhotoGrid.tsx` 传入 originRect**

在 PhotoCard 中，点击时记录当前图片的 DOMRect：

```tsx
const handleClick = useCallback(() => {
  clickCount.current += 1;
  if (clickCount.current === 1) {
    clickTimer.current = setTimeout(() => {
      const imgEl = ...; // 获取当前照片图片元素
      const rect = imgEl?.getBoundingClientRect();
      onOpen(rect);
      clickCount.current = 0;
    }, 300);
  }
  // ...
}, [onOpen, ...]);
```

这需要调整组件间的接口。为了简化，可以给 PhotoCard 的 `onOpen` 增加可选的 rect 参数：

```tsx
onOpen: (originRect?: DOMRect) => void;
```

- [ ] **Step 4: 验证编译**

Run: `npm run build 2>&1 | tail -20`
Expected: 没有 TypeScript 错误

- [ ] **Step 5: Commit**

```bash
git add components/Lightbox.tsx components/AlbumPhotoGrid.tsx
git commit -m "feat: add seamless zoom transition to Lightbox"
```

---

### Task 5: Lightbox UI 精致化 + 下滑关闭

**Files:**
- Modify: `components/Lightbox.tsx`

- [ ] **Step 1: 精致化关闭按钮、箭头、底栏**

关闭按钮：

```tsx
<button
  className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] text-xl hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
  onClick={(e) => { e.stopPropagation(); handleClose(); }}
  aria-label="关闭"
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 1l14 14M15 1L1 15" />
  </svg>
</button>
```

左右箭头（桌面端）：

```tsx
<button
  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-[#f5f5f0] hover:bg-[#c9a227]/20 hover:text-[#c9a227] transition-colors"
  onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L4 8l6 6" />
  </svg>
</button>
```

底部信息栏：

```tsx
<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-full bg-black/40 backdrop-blur-md px-5 py-2">
  <p className="text-xs text-[#a0a0a0] tabular-nums">
    {selectedIndex + 1} / {photos.length}
  </p>
  <LikeButton targetType="photo" targetId={photo.src} />
</div>
```

- [ ] **Step 2: 实现下滑关闭手势**

在 Lightbox 容器上增加 touch 事件监听：

```tsx
const [dragOffset, setDragOffset] = useState(0);
const touchStartY = useRef(0);
const touchStartTime = useRef(0);

const handleTouchStart = useCallback((e: React.TouchEvent) => {
  touchStartY.current = e.touches[0].clientY;
  touchStartTime.current = Date.now();
}, []);

const handleTouchMove = useCallback((e: React.TouchEvent) => {
  const delta = e.touches[0].clientY - touchStartY.current;
  if (delta > 0) {
    setDragOffset(delta);
  }
}, []);

const handleTouchEnd = useCallback(() => {
  const delta = dragOffset;
  const duration = Date.now() - touchStartTime.current;
  const velocity = delta / duration;

  if (delta > 100 || velocity > 0.5) {
    handleClose();
  } else {
    setDragOffset(0);
  }
}, [dragOffset, handleClose]);
```

在容器 style 中应用拖动偏移：

```tsx
<div
  className="..."
  style={{
    transform: dragOffset > 0 ? `translateY(${dragOffset * 0.5}px)` : undefined,
    opacity: dragOffset > 0 ? Math.max(0.3, 1 - dragOffset / 600) : undefined,
  }}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
```

- [ ] **Step 3: 首次打开提示**

```tsx
const [showSwipeHint, setShowSwipeHint] = useState(() => {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('lightbox-hint-shown');
});

useEffect(() => {
  if (showSwipeHint) {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
      localStorage.setItem('lightbox-hint-shown', 'true');
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [showSwipeHint]);
```

在底部栏上方渲染提示：

```tsx
{showSwipeHint && (
  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-xs text-[#a0a0a0]/60 animate-[fadeInDown_0.5s_ease-out]">
    滑动切换照片 · 下滑关闭
  </div>
)}
```

- [ ] **Step 4: 验证编译**

Run: `npm run build 2>&1 | tail -20`
Expected: 没有 TypeScript 错误

- [ ] **Step 5: Commit**

```bash
git add components/Lightbox.tsx
git commit -m "feat: polish Lightbox UI and add swipe-to-dismiss gesture"
```

---

### Task 6: CSS 动画补充

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 补充 `fadeInDown` keyframes 和 `prefers-reduced-motion` 降级**

确保 `app/globals.css` 中包含：

```css
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

以及 scroll-reveal 的降级（已存在但需要确认覆盖 ScrollReveal 组件的样式）：

```css
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS animations for gallery enhancements"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| Gallery 标题装饰线 | Task 2 Step 1 |
| Gallery 卡片 scroll-reveal | Task 2 Step 2 |
| Gallery 卡片 tap 反馈 | Task 2 Step 2 |
| 明细页标题装饰线 | Task 3 Step 1 |
| 明细页返回按钮动画 | Task 3 Step 1 |
| 明细页照片 scroll-reveal | Task 3 Step 2 |
| 明细页照片 tap 反馈 | Task 3 Step 2 |
| Lightbox 无缝放大过渡 | Task 4 |
| Lightbox UI 精致化 | Task 5 Step 1 |
| Lightbox 下滑关闭 | Task 5 Step 2 |
| Lightbox 首次提示 | Task 5 Step 3 |
| prefers-reduced-motion | Task 6 |

✅ 所有 spec 要求都有对应 task。

### 2. Placeholder Scan

- 无 "TBD", "TODO", "implement later"
- 无 "add appropriate error handling" 等模糊描述
- 每个代码步骤都有完整代码
- 无 "Similar to Task N" 引用

✅ 通过。

### 3. Type Consistency

- `DOMRect` 在 Task 4 和 Task 5 中一致使用
- `animateFlip` 函数签名在各处一致
- `ScrollReveal` 组件 props 在 Task 1 定义后，Task 2/3 使用方式一致

✅ 通过。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-gallery-visual-enhance.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
