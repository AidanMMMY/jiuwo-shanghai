# JIUWO SEO 优化方案总结

> 更新日期：2026-05-29
>
> 包含两版优化：基础 SEO 设置 + LGBTQ+/Shanghai bar 关键词优化

---

## 第一版：基础 SEO 设置（2026-05-29）

### 1. 自动生成 Sitemap

文件：`app/sitemap.ts`

- 自动生成全站 `sitemap.xml`
- 覆盖所有中英文静态页、journal 文章、gallery 相册
- 每页带 `hreflang` 交替语言标注（`zh-CN` / `en`）
- 支持优先级 (`priority`) 和更新频率 (`changeFrequency`)

访问地址：`https://jiuwoshanghai.net/sitemap.xml`

### 2. Robots.txt

文件：`public/robots.txt`

- 允许全站爬取
- 屏蔽 `/admin/`
- 引用 sitemap

### 3. 全局 Metadata（根 Layout）

文件：`app/layout.tsx`

- `metadataBase`: `https://jiuwoshanghai.net`
- Title template: `%s | JIUWO`，默认：`JIUWO — Shanghai Cocktail Bar & Wine Lounge`
- 全局 description 和 keywords
- Open Graph 默认配置（type, locale, siteName, 默认图片）
- Twitter Card 配置
- Robots 规则（index + follow + Google 预览参数）

### 4. 页面级独立 Metadata（10 个页面）

每个页面都有独立的 `title`、`description`、`canonical`：

| 页面 | EN Title | ZH Title |
|------|----------|----------|
| 首页 | `JIUWO — Shanghai Cocktail Bar & Wine Lounge` | `JIUWO 啾喔 — 上海鸡尾酒吧` |
| About | `About \| JIUWO` | `关于我们 \| JIUWO` |
| Menu | `Menu \| JIUWO` | `酒单 \| JIUWO` |
| Gallery | `Gallery \| JIUWO` | `画册 \| JIUWO` |
| Guestbook | `Guestbook \| JIUWO` | `客言 \| JIUWO` |

### 5. 动态页面 Metadata

**Journal 文章页** (`app/(en)/updates/[slug]/page.tsx`, `app/zh/updates/[slug]/page.tsx`)

- 标题：文章标题
- 描述：文章内容前 160 字符
- OG 图片：文章封面图

**Gallery 相册页** (`app/(en)/gallery/[album]/page.tsx`, `app/zh/gallery/[album]/page.tsx`)

- 标题：相册标题
- 描述：相册副标题
- OG 图片：相册封面图

### 6. Open Graph 默认图

文件：`public/images/og-default.jpg`

- 尺寸：1200 × 630 像素
- 来源：hero-01.webp 居中裁剪缩放
- 用途：所有页面的默认社交分享预览图

### 7. 结构化数据（JSON-LD）

文件：`app/(en)/about/page.tsx`, `app/zh/about/page.tsx`

- 类型：`BarOrPub`（Schema.org）
- 包含字段：名称、地址、坐标、营业时间、价格区间、邮箱、社交媒体

---

## 第二版：LGBTQ+/Shanghai bar 关键词优化（2026-05-29）

### 1. 全局 Keywords 扩展

文件：`app/layout.tsx`

新增关键词：

- `queer friendly bar Shanghai`
- `gay bar Shanghai`
- `LGBTQ bar Shanghai`
- `LGBT friendly bar`
- `上海酒吧`

### 2. 页面描述优化

**根 layout description**

> "JIUWO is a queer-friendly cocktail bar on Julu Road in Shanghai. Natural wines, craft cocktails, rock oolong tea, and a welcoming space for everyone."

**EN 首页**

> "JIUWO — a queer-friendly cocktail bar on Julu Road, Shanghai."

**ZH 首页**

> "JIUWO 啾喔，上海巨鹿路上一家友好的鸡尾酒吧...温馨 welcoming 的空间"

**EN About**

> "JIUWO is a queer-friendly cocktail bar... A welcoming space for Shanghai's LGBTQ community."

**ZH About**

> "JIUWO 啾喔，上海巨鹿路上一家友好开放的鸡尾酒吧...上海 LGBTQ 社群的温馨聚集地"

### 3. JSON-LD Audience 标注

文件：`app/(en)/about/page.tsx`, `app/zh/about/page.tsx`

```json
"audience": {
  "@type": "PeopleAudience",
  "audienceType": "LGBTQ+ friendly"
}
```

让搜索引擎和 Rich Results 明确识别酒吧的社区属性。

---

## 后续建议（未实施）

### 高优先级

1. **Google Business Profile**
   - 在 [business.google.com](https://business.google.com) 创建商家档案
   - 类别：Bar / Cocktail Bar
   - 勾选 **LGBTQ+ friendly** 属性
   - 这是提升 "shanghai gay bar" 本地搜索排名的最有效方法

2. **Google Search Console 验证**
   - 替换 `app/layout.tsx` 中的 `google-site-verification-code` 占位符
   - 提交 sitemap.xml 并监控索引状态

### 中优先级

3. **外链建设**
   - Time Out Shanghai：联系编辑争取收录到 "Best bars in Shanghai"
   - That's Shanghai：bar guide 投稿
   - SmartShanghai：提交商家信息
   - TripAdvisor：创建商家列表

4. **用户评论**
   - 在吧台放置 Google Review 引导牌
   - 或在 guestbook 页面引导至 Google Maps 评论

### 低优先级

5. **内容优化**
   - 在 `data/about.json` 的品牌故事中自然融入 LGBTQ+ 社区相关叙述
   - Gallery 图片 alt 文本加入场景描述

---

## 验证工具

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Sitemap 验证](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [Google Search Console](https://search.google.com/search-console)
