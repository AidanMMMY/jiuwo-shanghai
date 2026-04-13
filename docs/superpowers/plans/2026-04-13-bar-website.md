# 酒吧主题网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Next.js 15 + TypeScript + Tailwind CSS 的静态酒吧品牌展示网站，支持首页 Hero 轮播、图文日记、画册专辑、分类酒单和酒吧信息展示。

**Architecture:** 使用 Next.js App Router 和静态导出 (SSG)，所有内容通过 `/data` 目录下的本地 JSON 文件驱动。组件按功能拆分，UI 组件与数据获取逻辑分离。图片存放在 `/public/images`。

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, `remark` + `remark-html` (Markdown 解析), `next/image` (图片优化)

---

## File Structure

```
app/
  layout.tsx              # 根布局：全局字体、背景色、导航栏
  page.tsx                # 首页：Hero + Journal 瀑布流
  globals.css             # 全局样式、自定义颜色变量
  gallery/
    page.tsx              # 画册专辑列表页
    [album]/
      page.tsx            # 单个相册详情页
  journal/
    [slug]/
      page.tsx            # 日记详情页
  menu/
    page.tsx              # 酒单页
  about/
    page.tsx              # 酒吧信息页
components/
  Navbar.tsx              # 固定顶部导航栏（滚动感知背景）
  HeroCarousel.tsx        # 首页全屏轮播组件
  JournalCard.tsx         # 日记卡片组件
  JournalList.tsx         # 日记瀑布流列表
  GalleryGrid.tsx         # 画册封面网格
  PhotoGrid.tsx           # 相册内照片网格
  Lightbox.tsx            # 图片全屏查看组件
  MenuSection.tsx         # 酒单分类区块
  MenuNav.tsx             # 酒单分类锚点导航
  Footer.tsx              # 页脚组件
lib/
  data.ts                 # 所有 JSON 数据读取函数和类型定义
  utils.ts                # 通用工具函数（如日期格式化）
data/
  site.json               # 网站全局信息
  hero.json               # 轮播图数据
  journal.json            # 图文日记数据
  gallery.json            # 画册专辑数据
  menu.json               # 酒单数据
  about.json              # 酒吧信息数据
public/
  images/                 # 所有图片资源
next.config.ts            # Next.js 配置（静态导出）
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `app/globals.css`
- Modify: `.gitignore`

- [ ] **Step 1: 初始化 Next.js 15 项目**

```bash
cd /Users/aidanliu/Documents/JIUWO\ Shanghai
npx shadcn@latest init --yes --template next --base-color stone
```

Expected: 项目初始化完成，生成 `app/`、`components/`、`lib/`、`public/` 等目录。

- [ ] **Step 2: 安装额外依赖**

```bash
npm install remark remark-html clsx tailwind-merge
```

Expected: `package.json` 中新增 `remark`, `remark-html`, `clsx`, `tailwind-merge`。

- [ ] **Step 3: 配置 Next.js 静态导出**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: 配置全局样式（暗色主题变量）**

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #f5f5f0;
  --muted: #a0a0a0;
  --accent: #c9a227;
  --card: #141414;
  --border: #222222;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js 15 project with dark theme"
```

---

## Task 2: 数据层 — 类型定义与读取函数

**Files:**
- Create: `lib/data.ts`
- Create: `data/site.json`
- Create: `data/hero.json`
- Create: `data/journal.json`
- Create: `data/gallery.json`
- Create: `data/menu.json`
- Create: `data/about.json`

- [ ] **Step 1: 定义所有数据类型**

```typescript
// lib/data.ts
import { promises as fs } from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'data');

export type NavItem = { label: string; href: string };

export type SiteData = {
  name: string;
  tagline: string;
  nav: NavItem[];
  social: {
    instagram?: string;
    weibo?: string;
    xiaohongshu?: string;
  };
};

export type HeroSlide = {
  src: string;
  alt: string;
};

export type JournalEntry = {
  slug: string;
  title: string;
  date: string;
  cover: string;
  content: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  cover: string;
  photos: { src: string; alt: string }[];
};

export type MenuItem = {
  name: string;
  price: string;
  description: string;
};

export type MenuCategory = {
  category: string;
  items: MenuItem[];
};

export type AboutData = {
  hours: string;
  address: string;
  phone: string;
  mapEmbedUrl: string;
  story: string;
};

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDirectory, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function getSiteData(): Promise<SiteData> {
  return readJsonFile<SiteData>('site.json');
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return readJsonFile<HeroSlide[]>('hero.json');
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const entries = await readJsonFile<JournalEntry[]>('journal.json');
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntries();
  return entries.find((e) => e.slug === slug);
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  return readJsonFile<GalleryAlbum[]>('gallery.json');
}

export async function getGalleryAlbum(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbums();
  return albums.find((a) => a.id === id);
}

export async function getMenu(): Promise<MenuCategory[]> {
  return readJsonFile<MenuCategory[]>('menu.json');
}

export async function getAboutData(): Promise<AboutData> {
  return readJsonFile<AboutData>('about.json');
}
```

- [ ] **Step 2: 创建示例数据文件**

```json
// data/site.json
{
  "name": "无名酒吧",
  "tagline": "今夜，从这里开始",
  "nav": [
    { "label": "首页", "href": "/" },
    { "label": "画册", "href": "/gallery" },
    { "label": "酒单", "href": "/menu" },
    { "label": "信息", "href": "/about" }
  ],
  "social": {
    "instagram": "https://instagram.com",
    "weibo": "https://weibo.com",
    "xiaohongshu": "https://xiaohongshu.com"
  }
}
```

```json
// data/hero.json
[
  { "src": "/images/hero/hero-1.jpg", "alt": "吧台夜景" },
  { "src": "/images/hero/hero-2.jpg", "alt": "特调鸡尾酒" },
  { "src": "/images/hero/hero-3.jpg", "alt": "客座一角" }
]
```

```json
// data/journal.json
[
  {
    "slug": "opening-night",
    "title": "开业那晚",
    "date": "2025-03-15",
    "cover": "/images/journal/opening.jpg",
    "content": "三月的一个周五晚上，我们迎来了第一批客人。灯光调得很低，音乐从老旧的唱机里缓缓流出..."
  },
  {
    "slug": "spring-cocktails",
    "title": "春季特调上新",
    "date": "2025-04-01",
    "cover": "/images/journal/spring.jpg",
    "content": "这个季节我们带来了三款以花香和柑橘为主调的新品，适合在渐暖的夜晚慢慢品味。"
  }
]
```

```json
// data/gallery.json
[
  {
    "id": "opening-party",
    "title": "开业派对",
    "cover": "/images/gallery/opening-cover.jpg",
    "photos": [
      { "src": "/images/gallery/opening-1.jpg", "alt": "开业当晚" },
      { "src": "/images/gallery/opening-2.jpg", "alt": "朋友们" }
    ]
  },
  {
    "id": "bartender-spotlight",
    "title": "调酒师特辑",
    "cover": "/images/gallery/bartender-cover.jpg",
    "photos": [
      { "src": "/images/gallery/bartender-1.jpg", "alt": "调酒师工作照" }
    ]
  }
]
```

```json
// data/menu.json
[
  {
    "category": "鸡尾酒",
    "items": [
      { "name": "老式经典", "price": "88", "description": "波本威士忌、苦精、方糖、橙皮" },
      { "name": "尼格罗尼", "price": "92", "description": "金酒、金巴利、甜味美思" }
    ]
  },
  {
    "category": "威士忌",
    "items": [
      { "name": "山崎 12年", "price": "168", "description": "日本单一麦芽威士忌" },
      { "name": "拉弗格 10年", "price": "138", "description": "艾雷岛单一麦芽威士忌，浓郁泥煤风味" }
    ]
  }
]
```

```json
// data/about.json
{
  "hours": "周一至周日 19:00 - 02:00",
  "address": "上海市静安区某某路 123 号",
  "phone": "021-1234 5678",
  "mapEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3411.8372887680034!2d121.44",
  "story": "无名酒吧创立于 2024 年。我们相信，一杯好酒、一段好音乐，足以让夜晚变得不同。"
}
```

- [ ] **Step 3: 创建占位图片目录**

```bash
mkdir -p public/images/hero public/images/journal public/images/gallery
```

- [ ] **Step 4: Commit**

```bash
git add lib/data.ts data/ public/images/
git commit -m "feat: add data layer types and sample JSON files"
```

---

## Task 3: Navbar 组件

**Files:**
- Create: `components/Navbar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 实现 Navbar 组件**

```tsx
// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { NavItem } from '@/lib/data';

export default function Navbar({
  name,
  nav,
}: {
  name: string;
  nav: NavItem[];
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-sm' : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors">
          {name}
        </Link>
        <nav className="flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 更新根布局**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSiteData } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "无名酒吧",
  description: "今夜，从这里开始",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteData();

  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx app/layout.tsx
git commit -m "feat: add scroll-aware Navbar and root layout"
```

---

## Task 4: Hero 轮播组件

**Files:**
- Create: `components/HeroCarousel.tsx`

- [ ] **Step 1: 实现 HeroCarousel**

```tsx
// components/HeroCarousel.tsx
'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { HeroSlide } from '@/lib/data';

export default function HeroCarousel({
  slides,
  title,
  tagline,
}: {
  slides: HeroSlide[];
  title: string;
  tagline: string;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-6xl font-medium tracking-widest text-[#f5f5f0] mb-4">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-[#a0a0a0] tracking-wide">
          {tagline}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/HeroCarousel.tsx
git commit -m "feat: add HeroCarousel with auto-fade slideshow"
```

---

## Task 5: 日记相关组件与首页

**Files:**
- Create: `components/JournalCard.tsx`
- Create: `components/JournalList.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: 实现 JournalCard**

```tsx
// components/JournalCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { JournalEntry } from '@/lib/data';

export default function JournalCard({ entry }: { entry: JournalEntry }) {
  const summary = entry.content.slice(0, 100) + (entry.content.length > 100 ? '…' : '');

  return (
    <article className="group">
      <Link href={`/journal/${entry.slug}`}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg mb-4">
          <Image
            src={entry.cover}
            alt={entry.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <time className="text-xs text-[#a0a0a0]">{entry.date}</time>
        <h2 className="text-xl font-medium text-[#f5f5f0] mt-1 mb-2 group-hover:text-[#c9a227] transition-colors">
          {entry.title}
        </h2>
        <p className="text-sm text-[#a0a0a0] leading-relaxed">{summary}</p>
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: 实现 JournalList**

```tsx
// components/JournalList.tsx
import JournalCard from './JournalCard';
import type { JournalEntry } from '@/lib/data';

export default function JournalList({ entries }: { entries: JournalEntry[] }) {
  return (
    <section className="py-20 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-medium text-[#f5f5f0] mb-12 tracking-wide">日记</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map((entry) => (
            <JournalCard key={entry.slug} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 实现首页 page.tsx**

```tsx
// app/page.tsx
import HeroCarousel from '@/components/HeroCarousel';
import JournalList from '@/components/JournalList';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';

export default async function HomePage() {
  const [site, slides, entries] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
  ]);

  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} />
      <JournalList entries={entries} />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/JournalCard.tsx components/JournalList.tsx app/page.tsx
git commit -m "feat: add Journal components and Home page"
```

---

## Task 6: 日记详情页

**Files:**
- Create: `app/journal/[slug]/page.tsx`
- Create: `lib/utils.ts`

- [ ] **Step 1: 添加 Markdown 解析工具函数**

```typescript
// lib/utils.ts
import { remark } from 'remark';
import html from 'remark-html';

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown);
  return result.toString();
}
```

- [ ] **Step 2: 实现日记详情页**

```tsx
// app/journal/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJournalEntries, getJournalEntry } from '@/lib/data';
import { markdownToHtml } from '@/lib/utils';

export async function generateStaticParams() {
  const entries = await getJournalEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) notFound();

  const contentHtml = await markdownToHtml(entry.content);

  return (
    <article className="pt-24 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          ← 返回首页
        </Link>
        <header className="mt-8 mb-10">
          <time className="text-sm text-[#a0a0a0]">{entry.date}</time>
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] mt-2 tracking-wide">
            {entry.title}
          </h1>
        </header>
        <div className="relative aspect-[16/9] w-full mb-10 rounded-lg overflow-hidden">
          <Image src={entry.cover} alt={entry.title} fill className="object-cover" />
        </div>
        <div
          className="prose prose-invert prose-stone max-w-none prose-headings:text-[#f5f5f0] prose-p:text-[#a0a0a0] prose-a:text-[#c9a227]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils.ts app/journal/
git commit -m "feat: add journal detail page with markdown rendering"
```

---

## Task 7: 画册页与相册详情页

**Files:**
- Create: `components/GalleryGrid.tsx`
- Create: `app/gallery/page.tsx`
- Create: `app/gallery/[album]/page.tsx`

- [ ] **Step 1: 实现 GalleryGrid**

```tsx
// components/GalleryGrid.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryGrid({ albums }: { albums: GalleryAlbum[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map((album) => (
        <Link key={album.id} href={`/gallery/${album.id}`} className="group block">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={album.cover}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-medium text-[#f5f5f0]">{album.title}</h3>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 实现画册列表页**

```tsx
// app/gallery/page.tsx
import GalleryGrid from '@/components/GalleryGrid';
import { getGalleryAlbums } from '@/lib/data';

export default async function GalleryPage() {
  const albums = await getGalleryAlbums();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">画册</h1>
        <GalleryGrid albums={albums} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 实现相册详情页**

```tsx
// app/gallery/[album]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGalleryAlbum, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album: string }>;
}) {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) notFound();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href="/gallery" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          ← 返回画册
        </Link>
        <h1 className="text-3xl font-medium text-[#f5f5f0] mt-8 mb-12 tracking-wide">{data.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
              <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/GalleryGrid.tsx app/gallery/
git commit -m "feat: add gallery album list and detail pages"
```

---

## Task 8: Lightbox 组件（增强交互）

**Files:**
- Create: `components/Lightbox.tsx`
- Modify: `app/gallery/[album]/page.tsx`

- [ ] **Step 1: 实现 Lightbox 客户端组件**

```tsx
// components/Lightbox.tsx
'use client';

import Image from 'next/image';
import { useEffect, useCallback } from 'react';

export default function Lightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  photos: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (currentIndex < 0 || currentIndex >= photos.length) return null;

  const photo = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-6 right-6 text-[#f5f5f0] text-2xl hover:text-[#c9a227]"
        onClick={onClose}
        aria-label="关闭"
      >
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 text-[#f5f5f0] text-3xl hover:text-[#c9a227]"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 text-[#f5f5f0] text-3xl hover:text-[#c9a227]"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="下一张"
          >
            ›
          </button>
        </>
      )}
      <div className="relative w-[90vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.src} alt={photo.alt} fill className="object-contain" />
      </div>
      <p className="absolute bottom-6 text-sm text-[#a0a0a0]">
        {currentIndex + 1} / {photos.length}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 在相册详情页中集成 Lightbox**

将 `app/gallery/[album]/page.tsx` 修改为客户端/服务端混合结构。由于 Lightbox 需要客户端状态，将照片网格抽成单独的 Client Component 更合理。

创建 `components/AlbumPhotoGrid.tsx`：

```tsx
// components/AlbumPhotoGrid.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import Lightbox from './Lightbox';

export default function AlbumPhotoGrid({
  photos,
}: {
  photos: { src: string; alt: string }[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer"
            onClick={() => setLightboxIndex(idx)}
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
          </div>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((prev) => (prev === null || prev === 0 ? photos.length - 1 : prev - 1))}
          onNext={() => setLightboxIndex((prev) => (prev === null || prev === photos.length - 1 ? 0 : prev + 1))}
        />
      )}
    </>
  );
}
```

然后修改 `app/gallery/[album]/page.tsx`：

```tsx
// app/gallery/[album]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import { getGalleryAlbum, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ album: string }>;
}) {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) notFound();

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href="/gallery" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          ← 返回画册
        </Link>
        <h1 className="text-3xl font-medium text-[#f5f5f0] mt-8 mb-12 tracking-wide">{data.title}</h1>
        <AlbumPhotoGrid photos={data.photos} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Lightbox.tsx components/AlbumPhotoGrid.tsx app/gallery/
git commit -m "feat: add Lightbox for gallery photo viewing"
```

---

## Task 9: 酒单页

**Files:**
- Create: `components/MenuNav.tsx`
- Create: `components/MenuSection.tsx`
- Create: `app/menu/page.tsx`

- [ ] **Step 1: 实现 MenuNav**

```tsx
// components/MenuNav.tsx
'use client';

import type { MenuCategory } from '@/lib/data';

export default function MenuNav({ categories }: { categories: MenuCategory[] }) {
  return (
    <nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
      <div className="mx-auto max-w-7xl px-6 flex gap-6 overflow-x-auto">
        {categories.map((cat) => (
          <a
            key={cat.category}
            href={`#${cat.category}`}
            className="whitespace-nowrap text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
          >
            {cat.category}
          </a>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 实现 MenuSection**

```tsx
// components/MenuSection.tsx
import type { MenuCategory } from '@/lib/data';

export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.category} className="mb-16 scroll-mt-32">
      <h2 className="text-2xl font-medium text-[#f5f5f0] mb-8 tracking-wide">{category.category}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {category.items.map((item) => (
          <div key={item.name} className="flex justify-between items-baseline border-b border-[#222] pb-4">
            <div>
              <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
              <p className="text-sm text-[#a0a0a0] mt-1">{item.description}</p>
            </div>
            <span className="text-base font-medium text-[#c9a227] whitespace-nowrap ml-4">¥{item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 实现酒单页**

```tsx
// app/menu/page.tsx
import MenuNav from '@/components/MenuNav';
import MenuSection from '@/components/MenuSection';
import { getMenu } from '@/lib/data';

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-4 tracking-wide">酒单</h1>
        <p className="text-sm text-[#a0a0a0] mb-8">点击下方分类快速跳转</p>
      </div>
      <MenuNav categories={categories} />
      <div className="mx-auto max-w-7xl px-6">
        {categories.map((cat) => (
          <MenuSection key={cat.category} category={cat} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/MenuNav.tsx components/MenuSection.tsx app/menu/
git commit -m "feat: add menu page with category anchor navigation"
```

---

## Task 10: 酒吧信息页

**Files:**
- Create: `app/about/page.tsx`
- Create: `components/Footer.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 实现 About 页面**

```tsx
// app/about/page.tsx
import { getAboutData, getSiteData } from '@/lib/data';

export default async function AboutPage() {
  const [about, site] = await Promise.all([getAboutData(), getSiteData()]);

  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">关于我们</h1>

        <div className="space-y-10">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">营业时间</h2>
            <p className="text-lg text-[#f5f5f0]">{about.hours}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">地址</h2>
            <p className="text-lg text-[#f5f5f0]">{about.address}</p>
            <div className="mt-4 aspect-video w-full rounded-lg overflow-hidden border border-[#222]">
              <iframe
                src={about.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="地图"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">联系电话</h2>
            <p className="text-lg text-[#f5f5f0]">{about.phone}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">品牌故事</h2>
            <p className="text-base text-[#a0a0a0] leading-relaxed">{about.story}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 实现 Footer**

```tsx
// components/Footer.tsx
import { getSiteData } from '@/lib/data';

export default async function Footer() {
  const site = await getSiteData();

  return (
    <footer className="border-t border-[#222] bg-[#0a0a0a] py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-sm text-[#a0a0a0]">© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <div className="flex gap-6">
          {site.social.instagram && (
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              Instagram
            </a>
          )}
          {site.social.weibo && (
            <a href={site.social.weibo} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              微博
            </a>
          )}
          {site.social.xiaohongshu && (
            <a href={site.social.xiaohongshu} target="_blank" rel="noopener noreferrer" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
              小红书
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: 在根布局中加入 Footer**

修改 `app/layout.tsx`：

```tsx
// ... existing imports
import Footer from "@/components/Footer";

// ... inside RootLayout
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0">{children}</main>
        <Footer />
      </body>
```

- [ ] **Step 4: Commit**

```bash
git add app/about/page.tsx components/Footer.tsx app/layout.tsx
git commit -m "feat: add about page and footer"
```

---

## Task 11: 构建验证与清理

**Files:**
- Modify: `app/layout.tsx` (metadata 优化)
- Modify: `package.json` (build script verification)

- [ ] **Step 1: 更新 metadata 使用 site.json 数据**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteData } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteData();
  return {
    title: site.name,
    description: site.tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteData();

  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0 min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 运行构建并验证**

```bash
npm run build
```

Expected: 构建成功，无 TypeScript 错误，静态文件生成到 `dist/` 目录。

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "chore: optimize metadata and verify build"
```

---

## Self-Review

### Spec Coverage
- ✅ 首页 Hero 轮播 → Task 4
- ✅ 图文日记瀑布流 → Task 5
- ✅ 日记详情页 → Task 6
- ✅ 画册专辑列表与详情 → Task 7
- ✅ Lightbox 图片查看 → Task 8
- ✅ 酒单分类锚点导航 → Task 9
- ✅ 酒吧信息页（含地图） → Task 10
- ✅ 固定导航栏滚动感知 → Task 3
- ✅ 暗色主题 + 琥珀点缀 → Task 1 (globals.css)
- ✅ 本地 JSON 数据源 → Task 2
- ✅ 静态导出部署 → Task 1 (next.config.ts)

### Placeholder Scan
- 无 "TBD" / "TODO" / "implement later"
- 所有步骤均包含具体代码和预期命令
- 类型定义和组件接口保持一致

### Type Consistency
- `JournalEntry`, `GalleryAlbum`, `MenuCategory` 等类型在 `lib/data.ts` 中统一定义
- 所有组件 props 类型与数据类型严格对应
- `generateMetadata` 使用异步函数以匹配 Next.js 15 App Router 规范

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-bar-website.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach do you prefer?**
