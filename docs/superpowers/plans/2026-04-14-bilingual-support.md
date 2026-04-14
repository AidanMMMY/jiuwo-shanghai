# 酒吧网站双语支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 Next.js 15 静态导出酒吧网站增加英文/中文双语支持，英文位于根路径，中文位于 `/zh/` 子路径，避免页面逻辑重复。

**Architecture:** 采用同文件双语字段策略（`*Zh` 后缀），在 `lib/data.ts` 中为每种内容提供英文和中文两套读取函数。将各页面 UI 抽取为共享页面组件，由 `app/` 和 `app/zh/` 下的路由文件分别读取对应语言数据后传入。Navbar 增加基于当前 pathname 的语言切换按钮。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, static export

---

## 文件结构映射

| 文件 | 职责 |
|------|------|
| `data/*.json` | 6 个内容文件，新增 `*Zh` 字段存储中文内容 |
| `lib/data.ts` | 类型定义 + 12 个数据读取函数（6 个英文 + 6 个中文） |
| `app/components/pages/HomePage.tsx` | 首页 UI，接收 site/slides/entries/journalTitle |
| `app/components/pages/GalleryPage.tsx` | 画册列表 UI，接收 albums/title |
| `app/components/pages/GalleryAlbumPage.tsx` | 画册详情 UI，接收 album/backHref/backLabel |
| `app/components/pages/JournalPage.tsx` | 日志详情 UI，接收 entry/backLabel |
| `app/components/pages/MenuPage.tsx` | 酒单 UI，接收 categories/title/subtitle |
| `app/components/pages/AboutPage.tsx` | 关于页面 UI，接收 about/labels |
| `components/JournalList.tsx` | 日志卡片列表，接收 entries/title |
| `components/Navbar.tsx` | 导航栏 + 语言切换按钮（Client Component） |
| `components/Footer.tsx` | 页脚，改为接收 site prop |
| `app/layout.tsx` | 根布局（英文），读取英文 site 数据 |
| `app/zh/layout.tsx` | 中文子布局，读取中文 site 数据 |
| `app/*/page.tsx` | 6 个英文路由页面 |
| `app/zh/*/page.tsx` | 6 个中文路由页面 |

---

### Task 1: 更新 `data/site.json` 为双语格式

**Files:**
- Modify: `data/site.json`

- [ ] **Step 1: 用英文作为主字段，中文加 `*Zh` 后缀**

```json
{
  "name": "Nameless Bar",
  "nameZh": "无名酒吧",
  "tagline": "The night starts here.",
  "taglineZh": "今夜，从这里开始",
  "nav": [
    { "label": "Home", "href": "/", "labelZh": "首页" },
    { "label": "Gallery", "href": "/gallery", "labelZh": "画册" },
    { "label": "Menu", "href": "/menu", "labelZh": "酒单" },
    { "label": "About", "href": "/about", "labelZh": "信息" }
  ],
  "social": {
    "instagram": "https://instagram.com",
    "weibo": "https://weibo.com",
    "xiaohongshu": "https://xiaohongshu.com"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add data/site.json
git commit -m "data: make site.json bilingual"
```

---

### Task 2: 更新 `data/hero.json` 为双语格式

**Files:**
- Modify: `data/hero.json`

- [ ] **Step 1: 添加 `altZh` 字段**

```json
[
  { "src": "/images/hero/hero-1.jpg", "alt": "Bar at night", "altZh": "吧台夜景" },
  { "src": "/images/hero/hero-2.jpg", "alt": "Signature cocktails", "altZh": "特调鸡尾酒" },
  { "src": "/images/hero/hero-3.jpg", "alt": "Guest corner", "altZh": "客座一角" }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/hero.json
git commit -m "data: make hero.json bilingual"
```

---

### Task 3: 更新 `data/journal.json` 为双语格式

**Files:**
- Modify: `data/journal.json`

- [ ] **Step 1: 添加 `titleZh` 和 `contentZh` 字段**

```json
[
  {
    "slug": "opening-night",
    "title": "Opening Night",
    "titleZh": "开业那晚",
    "date": "2025-03-15",
    "cover": "/images/journal/opening.jpg",
    "content": "On a Friday night in March, we welcomed our first guests. The lights were dim, music flowed slowly from the vintage record player...",
    "contentZh": "三月的一个周五晚上，我们迎来了第一批客人。灯光调得很低，音乐从老旧的唱机里缓缓流出..."
  },
  {
    "slug": "spring-cocktails",
    "title": "Spring Cocktails",
    "titleZh": "春季特调上新",
    "date": "2025-04-01",
    "cover": "/images/journal/spring.jpg",
    "content": "This season we bring three new floral and citrus-forward creations, perfect for warming evenings.",
    "contentZh": "这个季节我们带来了三款以花香和柑橘为主调的新品，适合在渐暖的夜晚慢慢品味。"
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/journal.json
git commit -m "data: make journal.json bilingual"
```

---

### Task 4: 更新 `data/gallery.json` 为双语格式

**Files:**
- Modify: `data/gallery.json`

- [ ] **Step 1: 添加 `titleZh` 和 `altZh` 字段**

```json
[
  {
    "id": "opening-party",
    "title": "Opening Party",
    "titleZh": "开业派对",
    "cover": "/images/gallery/opening-cover.jpg",
    "photos": [
      { "src": "/images/gallery/opening-1.jpg", "alt": "Opening night", "altZh": "开业当晚" },
      { "src": "/images/gallery/opening-2.jpg", "alt": "Friends", "altZh": "朋友们" }
    ]
  },
  {
    "id": "bartender-spotlight",
    "title": "Bartender Spotlight",
    "titleZh": "调酒师特辑",
    "cover": "/images/gallery/bartender-cover.jpg",
    "photos": [
      { "src": "/images/gallery/bartender-1.jpg", "alt": "Bartender at work", "altZh": "调酒师工作照" }
    ]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/gallery.json
git commit -m "data: make gallery.json bilingual"
```

---

### Task 5: 更新 `data/menu.json` 为双语格式

**Files:**
- Modify: `data/menu.json`

- [ ] **Step 1: 添加 `categoryZh`、`nameZh`、`descriptionZh` 字段**

```json
[
  {
    "category": "Cocktails",
    "categoryZh": "鸡尾酒",
    "items": [
      { "name": "Old Fashioned", "nameZh": "老式经典", "price": "88", "description": "Bourbon, bitters, sugar cube, orange peel", "descriptionZh": "波本威士忌、苦精、方糖、橙皮" },
      { "name": "Negroni", "nameZh": "尼格罗尼", "price": "92", "description": "Gin, Campari, sweet vermouth", "descriptionZh": "金酒、金巴利、甜味美思" }
    ]
  },
  {
    "category": "Whisky",
    "categoryZh": "威士忌",
    "items": [
      { "name": "Yamazaki 12 Year", "nameZh": "山崎 12年", "price": "168", "description": "Japanese single malt whisky", "descriptionZh": "日本单一麦芽威士忌" },
      { "name": "Laphroaig 10 Year", "nameZh": "拉弗格 10年", "price": "138", "description": "Islay single malt whisky, rich peat smoke", "descriptionZh": "艾雷岛单一麦芽威士忌，浓郁泥煤风味" }
    ]
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add data/menu.json
git commit -m "data: make menu.json bilingual"
```

---

### Task 6: 更新 `data/about.json` 为双语格式

**Files:**
- Modify: `data/about.json`

- [ ] **Step 1: 添加 `*Zh` 字段**

```json
{
  "hours": "Mon - Sun 19:00 - 02:00",
  "hoursZh": "周一至周日 19:00 - 02:00",
  "address": "123 Mou Road, Jing'an District, Shanghai",
  "addressZh": "上海市静安区某某路 123 号",
  "phone": "021-1234 5678",
  "mapEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3411.8372887680034!2d121.44",
  "story": "Nameless Bar was founded in 2024. We believe a good drink and great music are enough to make the night different.",
  "storyZh": "无名酒吧创立于 2024 年。我们相信，一杯好酒、一段好音乐，足以让夜晚变得不同。"
}
```

- [ ] **Step 2: Commit**

```bash
git add data/about.json
git commit -m "data: make about.json bilingual"
```

---

### Task 7: 更新 `lib/data.ts` 类型和读取函数

**Files:**
- Modify: `lib/data.ts`

- [ ] **Step 1: 更新类型定义以包含 `*Zh` 字段**

```typescript
import { promises as fs } from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'data');

export type NavItem = { label: string; href: string; labelZh: string };

export type SiteData = {
  name: string;
  nameZh: string;
  tagline: string;
  taglineZh: string;
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
  altZh: string;
};

export type JournalEntry = {
  slug: string;
  title: string;
  titleZh: string;
  date: string;
  cover: string;
  content: string;
  contentZh: string;
};

export type GalleryPhoto = {
  src: string;
  alt: string;
  altZh: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  titleZh: string;
  cover: string;
  photos: GalleryPhoto[];
};

export type MenuItem = {
  name: string;
  nameZh: string;
  price: string;
  description: string;
  descriptionZh: string;
};

export type MenuCategory = {
  category: string;
  categoryZh: string;
  items: MenuItem[];
};

export type AboutData = {
  hours: string;
  hoursZh: string;
  address: string;
  addressZh: string;
  phone: string;
  mapEmbedUrl: string;
  story: string;
  storyZh: string;
};
```

- [ ] **Step 2: 添加通用的 `*Zh` 数据转换函数**

在同一个文件底部继续添加：

```typescript
async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDirectory, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

function localizeSite(site: SiteData): SiteData {
  return { ...site, name: site.nameZh, tagline: site.taglineZh, nav: site.nav.map((n) => ({ ...n, label: n.labelZh })) };
}

function localizeHero(slides: HeroSlide[]): HeroSlide[] {
  return slides.map((s) => ({ ...s, alt: s.altZh }));
}

function localizeJournal(entries: JournalEntry[]): JournalEntry[] {
  return entries.map((e) => ({ ...e, title: e.titleZh, content: e.contentZh }));
}

function localizeGallery(albums: GalleryAlbum[]): GalleryAlbum[] {
  return albums.map((a) => ({
    ...a,
    title: a.titleZh,
    photos: a.photos.map((p) => ({ ...p, alt: p.altZh })),
  }));
}

function localizeMenu(categories: MenuCategory[]): MenuCategory[] {
  return categories.map((c) => ({
    ...c,
    category: c.categoryZh,
    items: c.items.map((i) => ({ ...i, name: i.nameZh, description: i.descriptionZh })),
  }));
}

function localizeAbout(about: AboutData): AboutData {
  return {
    ...about,
    hours: about.hoursZh,
    address: about.addressZh,
    story: about.storyZh,
  };
}
```

- [ ] **Step 3: 添加英文和中文读取函数**

继续在同一文件中替换原有的导出函数：

```typescript
export async function getSiteData(): Promise<SiteData> {
  return readJsonFile<SiteData>('site.json');
}

export async function getSiteDataZh(): Promise<SiteData> {
  const site = await readJsonFile<SiteData>('site.json');
  return localizeSite(site);
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return readJsonFile<HeroSlide[]>('hero.json');
}

export async function getHeroSlidesZh(): Promise<HeroSlide[]> {
  const slides = await readJsonFile<HeroSlide[]>('hero.json');
  return localizeHero(slides);
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const entries = await readJsonFile<JournalEntry[]>('journal.json');
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getJournalEntriesZh(): Promise<JournalEntry[]> {
  const entries = await readJsonFile<JournalEntry[]>('journal.json');
  return localizeJournal(entries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getJournalEntry(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntries();
  return entries.find((e) => e.slug === slug);
}

export async function getJournalEntryZh(slug: string): Promise<JournalEntry | undefined> {
  const entries = await getJournalEntriesZh();
  return entries.find((e) => e.slug === slug);
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  return readJsonFile<GalleryAlbum[]>('gallery.json');
}

export async function getGalleryAlbumsZh(): Promise<GalleryAlbum[]> {
  const albums = await readJsonFile<GalleryAlbum[]>('gallery.json');
  return localizeGallery(albums);
}

export async function getGalleryAlbum(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbums();
  return albums.find((a) => a.id === id);
}

export async function getGalleryAlbumZh(id: string): Promise<GalleryAlbum | undefined> {
  const albums = await getGalleryAlbumsZh();
  return albums.find((a) => a.id === id);
}

export async function getMenu(): Promise<MenuCategory[]> {
  return readJsonFile<MenuCategory[]>('menu.json');
}

export async function getMenuZh(): Promise<MenuCategory[]> {
  const categories = await readJsonFile<MenuCategory[]>('menu.json');
  return localizeMenu(categories);
}

export async function getAboutData(): Promise<AboutData> {
  return readJsonFile<AboutData>('about.json');
}

export async function getAboutDataZh(): Promise<AboutData> {
  const about = await readJsonFile<AboutData>('about.json');
  return localizeAbout(about);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/data.ts
git commit -m "lib: add bilingual data types and Zh readers"
```

---

### Task 8: 更新 `components/JournalList.tsx` 接收 `title` prop

**Files:**
- Modify: `components/JournalList.tsx`

- [ ] **Step 1: 添加 title prop 并替换硬编码 "日记"**

```tsx
import JournalCard from './JournalCard';
import type { JournalEntry } from '@/lib/data';

export default function JournalList({ entries, title }: { entries: JournalEntry[]; title?: string }) {
  return (
    <section className="py-20 px-6 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{title ?? 'Journal'}</h2>
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

- [ ] **Step 2: Commit**

```bash
git add components/JournalList.tsx
git commit -m "ui: make JournalList title configurable"
```

---

### Task 9: 创建共享页面组件 `app/components/pages/HomePage.tsx`

**Files:**
- Create: `app/components/pages/HomePage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import HeroCarousel from '@/components/HeroCarousel';
import JournalList from '@/components/JournalList';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} />
      <JournalList entries={entries} title={journalTitle} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/HomePage.tsx
git commit -m "feat: extract HomePage shared component"
```

---

### Task 10: 创建共享页面组件 `app/components/pages/GalleryPage.tsx`

**Files:**
- Create: `app/components/pages/GalleryPage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import GalleryGrid from '@/components/GalleryGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryPage({ albums, title }: { albums: GalleryAlbum[]; title?: string }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{title ?? 'Gallery'}</h1>
        <GalleryGrid albums={albums} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/GalleryPage.tsx
git commit -m "feat: extract GalleryPage shared component"
```

---

### Task 11: 创建共享页面组件 `app/components/pages/GalleryAlbumPage.tsx`

**Files:**
- Create: `app/components/pages/GalleryAlbumPage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import Link from 'next/link';
import AlbumPhotoGrid from '@/components/AlbumPhotoGrid';
import type { GalleryAlbum } from '@/lib/data';

export default function GalleryAlbumPage({
  album,
  backHref,
  backLabel,
}: {
  album: GalleryAlbum;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl">
        <Link href={backHref ?? '/gallery'} className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          {backLabel ?? '← Back to Gallery'}
        </Link>
        <h1 className="text-3xl font-medium text-[#f5f5f0] mt-8 mb-12 tracking-wide">{album.title}</h1>
        <AlbumPhotoGrid photos={album.photos} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/GalleryAlbumPage.tsx
git commit -m "feat: extract GalleryAlbumPage shared component"
```

---

### Task 12: 创建共享页面组件 `app/components/pages/JournalPage.tsx`

**Files:**
- Create: `app/components/pages/JournalPage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { markdownToHtml } from '@/lib/utils';
import type { JournalEntry } from '@/lib/data';

export default async function JournalPage({
  entry,
  backLabel,
}: {
  entry: JournalEntry;
  backLabel?: string;
}) {
  const contentHtml = await markdownToHtml(entry.content);

  return (
    <article className="pt-24 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
          {backLabel ?? '← Back to home'}
        </Link>
        <header className="mt-8 mb-10">
          <time className="text-sm text-[#a0a0a0]">{entry.date}</time>
          <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] mt-2 tracking-wide">{entry.title}</h1>
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

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/JournalPage.tsx
git commit -m "feat: extract JournalPage shared component"
```

---

### Task 13: 创建共享页面组件 `app/components/pages/MenuPage.tsx`

**Files:**
- Create: `app/components/pages/MenuPage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import MenuNav from '@/components/MenuNav';
import MenuSection from '@/components/MenuSection';
import type { MenuCategory } from '@/lib/data';

export default function MenuPage({
  categories,
  title,
  subtitle,
}: {
  categories: MenuCategory[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-4 tracking-wide">{title ?? 'Menu'}</h1>
        <p className="text-sm text-[#a0a0a0] mb-8">{subtitle ?? 'Click a category below to jump'}</p>
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

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/MenuPage.tsx
git commit -m "feat: extract MenuPage shared component"
```

---

### Task 14: 创建共享页面组件 `app/components/pages/AboutPage.tsx`

**Files:**
- Create: `app/components/pages/AboutPage.tsx`

- [ ] **Step 1: 编写组件**

```tsx
import type { AboutData } from '@/lib/data';

export default function AboutPage({
  about,
  labels,
}: {
  about: AboutData;
  labels: {
    title: string;
    hours: string;
    address: string;
    mapTitle: string;
    phone: string;
    story: string;
  };
}) {
  return (
    <section className="pt-32 pb-20 px-6 bg-[#0a0a0a] min-h-screen">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-medium text-[#f5f5f0] mb-12 tracking-wide">{labels.title}</h1>

        <div className="space-y-10">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.hours}</h2>
            <p className="text-lg text-[#f5f5f0]">{about.hours}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.address}</h2>
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
                title={labels.mapTitle}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.phone}</h2>
            <p className="text-lg text-[#f5f5f0]">{about.phone}</p>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#a0a0a0] mb-2">{labels.story}</h2>
            <p className="text-base text-[#a0a0a0] leading-relaxed">{about.story}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/pages/AboutPage.tsx
git commit -m "feat: extract AboutPage shared component"
```

---

### Task 15: 更新 `components/Footer.tsx` 接收 `site` prop

**Files:**
- Modify: `components/Footer.tsx`

- [ ] **Step 1: 移除内部数据读取，改为接收 prop**

```tsx
import type { SiteData } from '@/lib/data';

export default function Footer({ site }: { site: SiteData }) {
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

- [ ] **Step 2: Commit**

```bash
git add components/Footer.tsx
git commit -m "ui: make Footer receive site prop"
```

---

### Task 16: 更新英文根布局 `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 将 `lang` 改为 `"en"`，并传递 `site` 给 Footer**

```tsx
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
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0 min-h-screen">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "layout: update root layout for English default"
```

---

### Task 17: 更新英文路由页面使用共享组件

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/gallery/page.tsx`
- Modify: `app/gallery/[album]/page.tsx`
- Modify: `app/journal/[slug]/page.tsx`
- Modify: `app/menu/page.tsx`
- Modify: `app/about/page.tsx`

- [ ] **Step 1: 重写 `app/page.tsx`**

```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="Journal" />;
}
```

- [ ] **Step 2: 重写 `app/gallery/page.tsx`**

```tsx
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbums } from '@/lib/data';

export default async function Page() {
  const albums = await getGalleryAlbums();
  return <GalleryPage albums={albums} title="Gallery" />;
}
```

- [ ] **Step 3: 重写 `app/gallery/[album]/page.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbum, getGalleryAlbums } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbums();
  return albums.map((album) => ({ album: album.id }));
}

export default async function Page({ params }: { params: Promise<{ album: string }> }) {
  const { album } = await params;
  const data = await getGalleryAlbum(album);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      backHref="/gallery"
      backLabel="← Back to Gallery"
    />
  );
}
```

- [ ] **Step 4: 重写 `app/journal/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntries, getJournalEntry } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntries();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) notFound();

  return <JournalPage entry={entry} backLabel="← Back to home" />;
}
```

- [ ] **Step 5: 重写 `app/menu/page.tsx`**

```tsx
import MenuPage from '@/app/components/pages/MenuPage';
import { getMenu } from '@/lib/data';

export default async function Page() {
  const categories = await getMenu();
  return <MenuPage categories={categories} title="Menu" subtitle="Click a category below to jump" />;
}
```

- [ ] **Step 6: 重写 `app/about/page.tsx`**

```tsx
import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutData } from '@/lib/data';

export default async function Page() {
  const about = await getAboutData();
  return (
    <AboutPage
      about={about}
      labels={{
        title: 'About Us',
        hours: 'Hours',
        address: 'Address',
        mapTitle: 'Map',
        phone: 'Phone',
        story: 'Our Story',
      }}
    />
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/gallery/page.tsx "app/gallery/[album]/page.tsx" app/journal/[slug]/page.tsx app/menu/page.tsx app/about/page.tsx
git commit -m "refactor: use shared page components in English routes"
```

---

### Task 18: 创建中文布局 `app/zh/layout.tsx`

**Files:**
- Create: `app/zh/layout.tsx`

- [ ] **Step 1: 编写中文布局**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteDataZh } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteDataZh();
  return {
    title: site.name,
    description: site.tagline,
  };
}

export default async function ZhLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteDataZh();

  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navbar name={site.name} nav={site.nav} />
        <main className="pt-0 min-h-screen">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/zh/layout.tsx
git commit -m "layout: add Chinese sub-layout at app/zh/layout"
```

---

### Task 19: 创建中文路由页面

**Files:**
- Create: `app/zh/page.tsx`
- Create: `app/zh/gallery/page.tsx`
- Create: `app/zh/gallery/[album]/page.tsx`
- Create: `app/zh/journal/[slug]/page.tsx`
- Create: `app/zh/menu/page.tsx`
- Create: `app/zh/about/page.tsx`

- [ ] **Step 1: 创建 `app/zh/page.tsx`**

```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlidesZh, getJournalEntriesZh, getSiteDataZh } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteDataZh(),
    getHeroSlidesZh(),
    getJournalEntriesZh(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="日记" />;
}
```

- [ ] **Step 2: 创建 `app/zh/gallery/page.tsx`**

```tsx
import GalleryPage from '@/app/components/pages/GalleryPage';
import { getGalleryAlbumsZh } from '@/lib/data';

export default async function Page() {
  const albums = await getGalleryAlbumsZh();
  return <GalleryPage albums={albums} title="画册" />;
}
```

- [ ] **Step 3: 创建 `app/zh/gallery/[album]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import GalleryAlbumPage from '@/app/components/pages/GalleryAlbumPage';
import { getGalleryAlbumZh, getGalleryAlbumsZh } from '@/lib/data';

export async function generateStaticParams() {
  const albums = await getGalleryAlbumsZh();
  return albums.map((album) => ({ album: album.id }));
}

export default async function Page({ params }: { params: Promise<{ album: string }> }) {
  const { album } = await params;
  const data = await getGalleryAlbumZh(album);
  if (!data) notFound();

  return (
    <GalleryAlbumPage
      album={data}
      backHref="/zh/gallery"
      backLabel="← 返回画册"
    />
  );
}
```

- [ ] **Step 4: 创建 `app/zh/journal/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import JournalPage from '@/app/components/pages/JournalPage';
import { getJournalEntriesZh, getJournalEntryZh } from '@/lib/data';

export async function generateStaticParams() {
  const entries = await getJournalEntriesZh();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getJournalEntryZh(slug);
  if (!entry) notFound();

  return <JournalPage entry={entry} backLabel="← 返回首页" />;
}
```

- [ ] **Step 5: 创建 `app/zh/menu/page.tsx`**

```tsx
import MenuPage from '@/app/components/pages/MenuPage';
import { getMenuZh } from '@/lib/data';

export default async function Page() {
  const categories = await getMenuZh();
  return <MenuPage categories={categories} title="酒单" subtitle="点击下方分类快速跳转" />;
}
```

- [ ] **Step 6: 创建 `app/zh/about/page.tsx`**

```tsx
import AboutPage from '@/app/components/pages/AboutPage';
import { getAboutDataZh } from '@/lib/data';

export default async function Page() {
  const about = await getAboutDataZh();
  return (
    <AboutPage
      about={about}
      labels={{
        title: '关于我们',
        hours: '营业时间',
        address: '地址',
        mapTitle: '地图',
        phone: '联系电话',
        story: '品牌故事',
      }}
    />
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/zh/page.tsx app/zh/gallery/page.tsx "app/zh/gallery/[album]/page.tsx" app/zh/journal/[slug]/page.tsx app/zh/menu/page.tsx app/zh/about/page.tsx
git commit -m "feat: add Chinese routes under /zh"
```

---

### Task 20: 在 `components/Navbar.tsx` 中添加语言切换器

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: 引入 `usePathname` 并实现切换逻辑**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isZh = pathname.startsWith('/zh');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const otherHref = isZh
    ? pathname === '/zh' || pathname === '/zh/'
      ? '/'
      : pathname.replace('/zh', '')
    : pathname === '/'
      ? '/zh'
      : `/zh${pathname}`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-sm' : 'bg-[#0a0a0a]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href={isZh ? '/zh' : '/'} className="text-lg font-medium tracking-wide text-[#f5f5f0] hover:text-[#c9a227] transition-colors">
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
          <div className="flex items-center gap-2 text-sm border-l border-[#333] pl-6 ml-2">
            <Link
              href={otherHref}
              className={`${isZh ? 'text-[#a0a0a0] hover:text-[#c9a227]' : 'text-[#f5f5f0] font-medium'} transition-colors`}
            >
              EN
            </Link>
            <span className="text-[#555]">/</span>
            <Link
              href={otherHref}
              className={`${isZh ? 'text-[#f5f5f0] font-medium' : 'text-[#a0a0a0] hover:text-[#c9a227]'} transition-colors`}
            >
              中
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Navbar.tsx
git commit -m "ui: add language switcher to Navbar"
```

---

### Task 21: 构建验证与修复

**Files:**
- 无特定文件，运行构建命令

- [ ] **Step 1: 运行构建**

```bash
npm run build
```

Expected: 构建成功，输出 `dist/` 目录，包含 `dist/index.html`、`dist/zh/index.html` 以及各子页面。

- [ ] **Step 2: 如果出现 TypeScript 错误，修复后重新构建**

常见错误及修复：

- **错误:** `Navbar` 中 `usePathname` 在服务端渲染时可能报错（如果 Navbar 被用于 Server Layout）。
  - **修复:** Navbar 已经标记为 `'use client'`，确认 `app/layout.tsx` 和 `app/zh/layout.tsx` 没有尝试在服务端直接读取 `usePathname`。

- **错误:** `JournalPage` 是 async 组件但可能被类型检查器警告。
  - **修复:** Next.js 15 支持 async Server Components，无需修改。

- **错误:** `distDir: 'dist'` 与 `output: 'export'` 组合正常，无需修改 `next.config.ts`。

- [ ] **Step 3: Commit（如有修复）**

如果无修复则跳过此步骤；如果有修复：

```bash
git add <fixed-files>
git commit -m "fix: resolve build issues for bilingual routes"
```

---

## 手动验收清单

在 `npm run build` 成功后，启动本地预览并验证：

```bash
npx serve dist
```

- [ ] 打开 `http://localhost:3000/`，页面为英文，`html` 标签 `lang="en"`。
- [ ] Navbar 显示英文导航：Home, Gallery, Menu, About。
- [ ] 点击 Navbar 的 **"中"**，跳转至 `http://localhost:3000/zh/`。
- [ ] `/zh/` 页面为中文，`html` 标签 `lang="zh-CN"`。
- [ ] Navbar 显示中文导航：首页, 画册, 酒单, 信息。
- [ ] 在中文首页点击 **"EN"**，跳转回英文首页 `/`。
- [ ] 进入 `/gallery` 和 `/zh/gallery`，标题分别为 "Gallery" 和 "画册"。
- [ ] 进入相册详情（如 `/gallery/opening-party` 和 `/zh/gallery/opening-party`），返回链接文字正确。
- [ ] 进入 `/menu` 和 `/zh/menu`，分类名称和商品名称正确对应语言。
- [ ] 进入 `/about` 和 `/zh/about`，各区块标题和内容正确对应语言。
- [ ] 进入日志详情（如 `/journal/opening-night` 和 `/zh/journal/opening-night`），标题和正文正确。

---

## 自我审查记录

**1. Spec 覆盖度检查**

| 设计文档要求 | 对应任务 |
|-------------|---------|
| 英文在根路径，中文在 `/zh/` | Task 16-19 |
| 同文件双语字段 `*Zh` | Task 1-6 |
| `lib/data.ts` 英文+中文读取函数 | Task 7 |
| 共享页面组件避免重复 | Task 9-14, 17, 19 |
| Navbar 语言切换器 | Task 20 |
| Footer 随语言变化 | Task 15-16, 18 |
| Metadata 中英文对应 | Task 16, 18 |
| 构建成功 | Task 21 |

**2. Placeholder 扫描**

计划内无 "TBD"、"TODO"、"implement later" 等占位符。所有代码块均提供完整实现。

**3. 类型一致性检查**

- `GalleryPhoto` 类型在 `lib/data.ts` 中定义，并在 `localizeGallery` 中使用，一致。
- `JournalPage` / `GalleryAlbumPage` / `MenuPage` / `AboutPage` 的 props 名称在各路由文件中一致。
- `Navbar` prop 名称保持 `name` 和 `nav`，与现有布局一致。
