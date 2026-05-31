# JIUWO 微信小程序迁移指南

> 从 Next.js Web 项目迁移到微信小程序的完整资产清单和上下文摘要
> 生成日期：2026-05-20

---

## 一、品牌资产（不可变更）

| 项目 | 值 | 备注 |
|------|-----|------|
| 英文名 | JIUWO | 始终大写 |
| 中文名 | 啾喔 | — |
| Slogan EN | Drink on me, the stars are watching | — |
| Slogan ZH | 风月好看 人间浪漫 | — |
| 主背景色 | `#0a0a0a` | 纯黑，无渐变/发光 |
| 文字色 | `#f5f5f0` | 暖白 |
| 点缀色 | `#c9a227` | 琥珀/铜金，用于价格、高亮 |
| 次要文字 | `#a0a0a0` | 中灰 |
| 成立时间 | 2022年8月 | — |
| 地址 | 上海市黄浦区巨鹿路 397 号 | — |
| 营业时间 | 周二至周日 19:00 - 02:00 | 周一店休 |
| 邮箱 | aidan@jiuwoshanghai.net | — |
| 社交媒体 | IG / 微博 / 小红书 | 只放这三个 |

**注意**：品牌色和 Slogan 已锁定，不要调整。

---

## 二、页面模块映射

Web 项目有 5 个页面，小程序建议对应为 5 个 tab/页面：

| Web 页面 | 路由 | 小程序建议 | 说明 |
|----------|------|-----------|------|
| 首页 | `/` | `pages/index/index` | Hero 轮播 + 动态日记列表 |
| 画册 | `/gallery` | `pages/gallery/gallery` | 画册专辑网格 |
| 酒单 | `/menu` | `pages/menu/menu` | 分类酒单，锚点导航 |
| 我们 | `/about` | `pages/about/about` | 品牌故事 + 营业信息 |
| 日记详情 | `/journal/[slug]` | `pages/journal-detail/journal-detail` | 单条日记完整内容 |

画廊子页（相册详情）建议作为 `pages/album-detail/album-detail`。

---

## 三、可直接复用的 JSON 数据文件

以下 6 个文件可直接复制到小程序项目的 `data/` 目录，字段结构保持不变：

### 1. `data/site.json` — 网站全局信息
```json
{
  "name": "JIUWO",
  "nameZh": "啾喔",
  "tagline": "Drink on me, the stars are watching",
  "taglineZh": "风月好看 人间浪漫",
  "intro": "Tea, Wine, Cocktails, and [[MUCH MORE]]",
  "introZh": "小酒吧，啥都有，[[全是朋友]]",
  "nav": [
    { "label": "Home", "href": "/", "labelZh": "首页" },
    { "label": "Gallery", "href": "/gallery", "labelZh": "画册" },
    { "label": "Menu", "href": "/menu", "labelZh": "酒单" },
    { "label": "About", "href": "/about", "labelZh": "我们" }
  ],
  "social": {
    "instagram": "https://instagram.com",
    "weibo": "https://weibo.com",
    "xiaohongshu": "https://xiaohongshu.com"
  }
}
```

**关键说明**：
- `intro` / `introZh` 中的 `[[...]]` 标记需要渲染为彩虹渐变文字（已实现的特效）
- 双语字段使用 `*Zh` 后缀，与 Web 项目保持一致
- 小程序以中文为主，但保留英文字段备用

### 2. `data/hero.json` — 首页轮播图
- 10 张全屏氛围照片
- 格式：`[{ "src": "/images/hero/hero-01.webp", "alt": "...", "altZh": "..." }, ...]`
- 小程序中建议改为 3-5 张，减少包体积

### 3. `data/about.json` — 酒吧信息
- 包含：营业时间（双语）、地址（双语）、邮箱、地图嵌入URL、品牌故事（双语）、引言（双语）、封面图
- `story` / `storyZh` 是多段文本，使用 `\n` 分隔

### 4. `data/menu.json` — 酒单
- 3 个分类：Cocktails（鸡尾酒）、BTG（杯酒）、Tea（茶）
- 每个酒款含：名称（双语）、价格、描述（双语）、图片路径
- **价格前缀统一用 "CNY"**（已锁定决策）
- 共 30 款酒品

### 5. `data/gallery.json` — 画册专辑
- 7 个专辑：Josh Hu / After Dark / Phillip / Dex / Zack / 一日店长 / 角落里的时间
- 每个专辑含：id、标题（双语）、副标题（双语）、封面图、照片数组
- 照片总数约 70 张，小程序建议按需加载或分页

### 6. `data/updates.json` — 动态日记
- 7 条日记（部分标记 `hidden: true`）
- 每条含：slug、标题（双语）、日期、封面图、内容（双语）、横竖版标记
- 按日期倒序排列

---

## 四、图片资产清单

### 4.1 Hero 轮播（10 张）
```
public/images/hero/hero-01.webp ~ hero-10.webp
```

### 4.2 品牌/关于（1 张）
```
public/images/about/IMG_1262.jpg
public/images/logo.png
```

### 4.3 酒单图片（30 张）
```
public/images/menu/cocktail/
  chungking-express.png, as-tears-go-by.png, shanghai-scoundrel.png,
  wuhan-scoundrel.png, quanzhou-scoundrel.png, long-island-iced-tea.png,
  the-wizard-of-oz.png, beijing-scoundrel.png, first-love.png,
  get-lost.png, whiskey-sour.png, gin-tonic.png

public/images/menu/BTG/
  Chianti.png, Asylia.png, Macallan12.png, Lagavulin16.png,
  Yamazaki1923.png, Glenfarclas15.png, MacallanSherry.png,
  Yamazaki12.png, Agavales.png, ShySecret.png

public/images/menu/tea/
  Snow-Whisking.png, Biandao.png, 7581.png, Hehua.png,
  Wintersweet.png, Lapsang.png, Cassia.png, Narcissus.png
```

### 4.4 画册图片（约 70 张）
```
public/images/gallery/after-dark/          (27 张)
public/images/gallery/one-night-host/      (28 张)
public/images/gallery/our-friend-josh-hu/  (6 张)
public/images/gallery/our-friend-phillip/  (7 张)
public/images/gallery/our-friend-dex/      (6 张)
public/images/gallery/our-friend-zack/     (3 张)
public/images/gallery/time-in-the-corners/ (3 张)
```

### 4.5 日记封面（7 张有效 + 若干内页）
```
public/images/journal/
  20240430.webp, 20260222-1.jpg, 20260222-2.jpg,
  20260417-C.JPG, 20260515.jpeg, dex-moment.webp, 20250523-1.webp
```

### 图片迁移注意事项
1. **格式转换**：微信小程序对 WebP 支持有限，建议将 `.webp` 转为 `.jpg` 或 `.png`
2. **大小限制**：小程序包总体积限制 2MB（可分包扩展到 20MB），大图建议压缩
3. **扩展名**：当前项目有 `.webp`, `.jpg`, `.jpeg`, `.png`, `.JPG` 混用，小程序建议统一小写
4. **云存储**：超过 2MB 的图片建议放腾讯云 COS 或微信云存储，JSON 中改为网络 URL

---

## 五、Web → 小程序 技术差异对照

| 方面 | Web (Next.js) | 微信小程序 |
|------|---------------|-----------|
| 框架 | React + Next.js | WXML + WXSS + JS/TS |
| 样式 | Tailwind CSS | WXSS（类似 CSS，无 Tailwind） |
| 路由 | 文件系统路由 | `app.json` pages 配置 |
| 数据 | 构建时读取 JSON | 运行时 `require` 或云函数 |
| 图片 | `<img>` / `next/image` | `<image>` 组件 |
| 轮播 | 自定义/Swiper 库 | `<swiper>` 内置组件 |
| 存储 | localStorage | `wx.setStorageSync` |
| 网络 | fetch | `wx.request` |

---

## 六、小程序特有注意事项

1. **分包加载**：酒单和画册图片多，建议用分包（subPackages）减少首屏加载
2. **图片预览**：微信小程序内置 `wx.previewImage`，无需自己实现 Lightbox
3. **地图**：`about` 页面可直接用 `<map>` 组件或跳转腾讯地图
4. **分享**：每个页面都要配置 `onShareAppMessage`，分享标题用 `site.json` 中的 slogan
5. **导航栏**：小程序顶部有系统导航栏，自定义导航需要额外配置
6. **TabBar**：建议底部 tab：首页 / 画册 / 酒单 / 我们

---

## 七、建议的文件复制命令

在新项目初始化后，从本项目的以下路径复制文件：

```bash
# 1. JSON 数据（全部）
cp data/*.json /path/to/miniproject/data/

# 2. 图片（选择性，建议压缩后）
cp -r public/images/about /path/to/miniproject/images/
cp -r public/images/hero /path/to/miniproject/images/
cp -r public/images/logo.png /path/to/miniproject/images/
cp -r public/images/menu /path/to/miniproject/images/

# 3. 画册和日记图片体积大，建议按需复制或上传云存储
cp -r public/images/gallery/our-friend-* /path/to/miniproject/images/gallery/
cp -r public/images/journal/*.{webp,jpg,jpeg,png,JPG} /path/to/miniproject/images/journal/

# 4. 本迁移指南也复制过去，作为新项目的 CLAUDE.md 参考
```

---

## 八、JSON 数据使用示例（小程序）

```javascript
// pages/menu/menu.js
const menuData = require('../../data/menu.json');
const siteData = require('../../data/site.json');

Page({
  data: {
    categories: menuData,
    site: siteData
  }
});
```

```xml
<!-- pages/menu/menu.wxml -->
<view wx:for="{{categories}}" wx:for-item="cat" wx:key="category">
  <text class="category-title">{{cat.categoryZh}}</text>
  <view wx:for="{{cat.items}}" wx:for-item="item" wx:key="name">
    <image src="{{item.image}}" mode="aspectFill"/>
    <text>{{item.nameZh}}</text>
    <text class="price">CNY {{item.price}}</text>
  </view>
</view>
```

---

## 九、新项目需要重新配置的记忆

在新项目的 `.claude/memory/` 中需要写入：

1. **品牌锁定**：颜色 `#c9a227/#0a0a0a/#f5f5f0`、Slogan、纯黑背景无发光
2. **双语策略**：保留 `*Zh` 后缀字段，以中文为主
3. **内容管理**：JSON 文件手动维护，拒绝 CMS
4. **用户画像**：Aidan 是店主，亲自做 UX 决策，通过感觉迭代

---

*本文件由 JIUWO Web 项目生成，用于指导微信小程序版本的开发。*
