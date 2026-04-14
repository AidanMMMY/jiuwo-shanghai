# 酒吧网站中英文双语支持设计文档

> 为现有 Next.js 15 静态导出网站增加英文/中文双语支持。英文为默认语言，位于根路径；中文位于 `/zh/` 子路径。

---

## 1. 设计目标

- 英文版作为默认语言，放置在根路径（`/`、`/gallery`、`/menu`、`/about`）。
- 中文版放置在 `/zh/` 子路径（`/zh/`、`/zh/gallery`、`/zh/menu`、`/zh/about`）。
- 避免页面逻辑重复：路由文件只负责读取数据和注入语言上下文，实际 UI 抽取为共享页面组件。
- Navbar 增加语言切换按钮，跳转至当前页面对应语言版本。
- 构建输出保持 `output: 'export'`，可继续部署在 Vercel / Netlify 等平台。

## 2. URL 结构

| 页面 | 英文 | 中文 |
|------|------|------|
| 首页 | `/` | `/zh/` |
| 画册列表 | `/gallery` | `/zh/gallery` |
| 画册详情 | `/gallery/:album` | `/zh/gallery/:album` |
| 日志详情 | `/journal/:slug` | `/zh/journal/:slug` |
| 酒单 | `/menu` | `/zh/menu` |
| 酒吧信息 | `/about` | `/zh/about` |

## 3. 数据组织策略：同文件双语字段

在现有 6 个 JSON 文件的基础上，为需要翻译的字段增加 `*Zh` 后缀的对应值。文件保留在 `data/` 目录下。

### 3.1 `site.json`
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
  "social": { "instagram": "...", "weibo": "...", "xiaohongshu": "..." }
}
```

### 3.2 `hero.json`
```json
[
  { "src": "/images/hero/hero-1.jpg", "alt": "Bar at night", "altZh": "吧台夜景" },
  ...
]
```

### 3.3 `journal.json`
```json
[
  {
    "slug": "opening-night",
    "title": "Opening Night",
    "titleZh": "开业那晚",
    "date": "2025-03-15",
    "cover": "/images/journal/opening.jpg",
    "content": "English content...",
    "contentZh": "三月的一个周五晚上..."
  },
  ...
]
```

### 3.4 `gallery.json`
```json
[
  {
    "id": "opening-party",
    "title": "Opening Party",
    "titleZh": "开业派对",
    "cover": "/images/gallery/opening-cover.jpg",
    "photos": [
      { "src": "/images/gallery/opening-1.jpg", "alt": "Opening night", "altZh": "开业当晚" },
      ...
    ]
  },
  ...
]
```

### 3.5 `menu.json`
```json
[
  {
    "category": "Cocktails",
    "categoryZh": "鸡尾酒",
    "items": [
      { "name": "Old Fashioned", "nameZh": "老式经典", "price": "88", "description": "...", "descriptionZh": "..." },
      ...
    ]
  },
  ...
]
```

### 3.6 `about.json`
```json
{
  "hours": "Mon - Sun 19:00 - 02:00",
  "hoursZh": "周一至周日 19:00 - 02:00",
  "address": "123某某路, Jing'an District, Shanghai",
  "addressZh": "上海市静安区某某路 123 号",
  "phone": "021-1234 5678",
  "mapEmbedUrl": "...",
  "story": "English story...",
  "storyZh": "无名酒吧创立于 2024 年..."
}
```

## 4. 类型系统与数据读取层

在 `lib/data.ts` 中：

- 更新 TypeScript 类型，为对象添加 `*Zh` 字段。
- 为每个内容提供两个导出函数：默认读取英文（如 `getSiteData()`），带 `Zh` 后缀读取中文（如 `getSiteDataZh()`）。
- 所有 `*Zh` 函数读取同一个 JSON 文件，但在返回前将 `*Zh` 字段覆盖到主字段（例如把 `nameZh` 赋给 `name`，把 `taglineZh` 赋给 `tagline`）。这样页面组件无需感知语言，只使用统一的 `SiteData`、`HeroSlide` 等类型。

## 5. 共享页面组件

为避免在 `app/` 和 `app/zh/` 中重复 JSX，将各页面 UI 抽取到 `app/components/pages/` 下：

- `HomePage.tsx` — 接收 `site`, `heroSlides`, `journalEntries`
- `GalleryPage.tsx` — 接收 `albums`
- `GalleryAlbumPage.tsx` — 接收 `album`
- `JournalPage.tsx` — 接收 `entry`
- `MenuPage.tsx` — 接收 `categories`
- `AboutPage.tsx` — 接收 `about`

这些组件都是 Server Component（不包含 `'use client'`），只负责渲染，不处理路由或数据读取。

## 6. App Router 文件结构

### 6.1 根布局与根路径（英文）
- `app/layout.tsx` — `lang="en"`，读取英文 `site.json`，注入英文 Navbar 和 Footer。
- `app/page.tsx` — 读取英文数据 → `<HomePage />`
- `app/gallery/page.tsx` — 读取英文数据 → `<GalleryPage />`
- `app/gallery/[album]/page.tsx` — 读取英文数据 → `<GalleryAlbumPage />`
- `app/journal/[slug]/page.tsx` — 读取英文数据 → `<JournalPage />`
- `app/menu/page.tsx` — 读取英文数据 → `<MenuPage />`
- `app/about/page.tsx` — 读取英文数据 → `<AboutPage />`

### 6.2 中文子路径
- `app/zh/layout.tsx` — 嵌套布局，`lang="zh-CN"`，读取中文 `site.json`，注入中文 Navbar 和 Footer。
- `app/zh/page.tsx` — 读取中文数据 → `<HomePage />`
- `app/zh/gallery/page.tsx` — 读取中文数据 → `<GalleryPage />`
- `app/zh/gallery/[album]/page.tsx` — 读取中文数据 → `<GalleryAlbumPage />`
- `app/zh/journal/[slug]/page.tsx` — 读取中文数据 → `<JournalPage />`
- `app/zh/menu/page.tsx` — 读取中文数据 → `<MenuPage />`
- `app/zh/about/page.tsx` — 读取中文数据 → `<AboutPage />`

## 7. Navbar 语言切换器

- 在 `components/Navbar.tsx` 中新增语言切换区域。
- 通过 `usePathname()` 获取当前路径：
  - 如果当前路径以 `/zh/` 开头，说明是中文页，切换按钮显示 "EN"，链接指向去掉 `/zh` 前缀的对应路径。
  - 否则是英文页，切换按钮显示 "中"，链接指向加上 `/zh` 前缀的对应路径。
- 首页特殊处理：`/zh/` ↔ `/`。
- 样式保持简洁：两个小文字按钮并排，当前语言用稍亮的颜色，可切换语言用较暗的颜色或下划线提示可点击。

## 8. Metadata

- `app/layout.tsx` 的 `generateMetadata` 读取英文 `site.json`，返回 `title: site.name`、`description: site.tagline`。
- `app/zh/layout.tsx` 的 `generateMetadata` 读取中文 `site.json`，返回对应的 `title` 和 `description`。

## 9. 构建与部署

- `next.config.ts` 保持 `output: 'export'` 和 `distDir: 'dist'` 不变。
- 静态导出会自动生成：
  - `dist/index.html`（英文首页）
  - `dist/zh/index.html`（中文首页）
  - 各子页面目录结构保持一致。

## 10. 验收标准

- `npm run build` 成功，无 TypeScript 或构建错误。
- 访问 `localhost:3000/` 显示英文内容，`html lang="en"`。
- 访问 `localhost:3000/zh/` 显示中文内容，`html lang="zh-CN"`。
- Navbar 语言切换按钮在所有页面可见且功能正常。
- 在中文页点击切换语言后，跳转至对应英文页；反之亦然。
- Gallery、Menu、About、Journal 各页中英文内容正确无误。
- 图片路径在两种语言下均能正常加载。
