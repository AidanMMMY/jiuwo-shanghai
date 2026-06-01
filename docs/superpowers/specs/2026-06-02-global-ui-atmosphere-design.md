# 全局 UI 氛围沉浸化设计

## 背景与目标

当前 JIUWO 网站各页面的视觉语言存在一定割裂：Hero 有轮播和彩虹流动标题，About 有 Aurora 背景，Gallery 有多层阴影卡片，Menu 是简洁的列表。虽然每个页面单独看都有设计细节，但缺少一种贯穿全站的"温度"和"流动感"。

本次优化的核心目标：
1. **温暖亲密** — 消除纯黑背景的"数字生硬感"，让网站有酒吧灯光包裹般的温度
2. **流动沉浸** — 页面之间、元素之间有连贯的叙事节奏，不是各自为政的动画
3. **精致质感** — 每个交互点都有细腻反馈，像拿起酒杯时那种考究的触感

---

## 方案选择

在三个备选方案中选择了 **方案 B（氛围沉浸化）**，理由：
- 方案 A（轻量精致化）太保守，改完后整体感受变化不明显
- 方案 C（完整叙事流动）容易过度设计，酒吧网站的核心仍是内容展示，动效不能喧宾夺主
- 方案 B 在"明显改变感受"和"可控的实现复杂度"之间找到了平衡点，每个改动都可以独立验证

---

## 章节 1：全局氛围层

### Film Grain 纹理

在 `body` 上叠加一个全屏伪元素，使用 SVG noise filter 生成极细腻的颗粒感。

- **透明度**：`opacity: 0.03`
- **动画**：每 0.1s 随机偏移 `translate`，创造"活"的胶片感
- **混合模式**：`mix-blend-mode: overlay`
- **无障碍**：`prefers-reduced-motion: reduce` 时停止位移动画，保留静态纹理

### 暖色环境光层

在 layout 根节点增加一个固定的全屏渐变层，模拟酒吧里柔和的暖光打在墙上的感觉。

- **颜色**：只用金色系的极低透明度变体（`rgba(201,162,39, 0.02)` ~ `rgba(168,42,74, 0.015)`）
- **形状**：三个巨大的径向渐变 blob，分别位于左上、右中、左下
- **动画**：每个 blob 以不同周期（25s、30s、35s）缓慢漂移和缩放，永不同步
- **强度**：比 About 页的 Aurora 更克制——只有在快速滚动或视线移开再回来时才会感知到背景在呼吸
- **与 Aurora 的关系**：About 页保留现有的 `AuroraBackground` 组件，环境光层在 Aurora 之下作为统一基底

### 底部渐变过渡

每个页面主内容末尾增加全宽柔和渐变：

```css
.page-bottom-fade {
  height: 120px;
  background: linear-gradient(to bottom, transparent, #0a0a0a);
}
```

让内容自然"溶解"进 Footer，避免硬切断。

---

## 章节 2：光影与交互精致化

### 卡片阴影系统

统一所有卡片/区域的阴影层次（目前 Gallery 和 GuestbookHook 不一致）：

- **默认状态**：`box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25)`
- **Hover 状态**：`box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)`，同时 `translateY(-2px)`
- **按压状态**：`translateY(0)` 阴影收缩

应用到：Gallery 卡片、GuestbookHook 面板、Menu 分类标签、About 信息卡片。

### 图片加载过渡

在现有 `FadeInImage` 的 opacity 渐变基础上，增加 blur-to-sharp 的"对焦感"：

- 加载前：`filter: blur(8px) scale(1.02)`
- 加载后：`filter: blur(0) scale(1)`，过渡 `700ms ease-out`
- 与 opacity 过渡同步

### 按钮与链接的光晕反馈

- **`.btn-gold` hover**：除现有边框/文字色变化外，增加 `box-shadow: 0 0 20px rgba(201,162,39,0.12)`
- **导航链接 hover**：下划线展开的同时，文字增加 `text-shadow: 0 0 12px rgba(201,162,39,0.3)`
- **Menu 分类导航当前项**：底部 indicator 加光晕 `box-shadow: 0 2px 8px rgba(201,162,39,0.4)`

### 边框精致化

卡片边框从纯色改为微妙的渐变边框：

```css
border-image: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) 1;
```

### 分割线呼吸效果

现有的 gold gradient divider（`via-[#c9a227]/40`）增加透明度轻微波动：

- 周期 `3s ease-in-out infinite`
- 透明度在 `0.35 ↔ 0.5` 之间波动，像蜡烛火焰的摇曳

---

## 章节 3：滚动叙事动效系统

### 差异化入场动画

按元素类型分配不同入场方式（共用缓动曲线 `cubic-bezier(0.16, 1, 0.3, 1)`）：

| 元素类型 | 入场方式 | 感觉 |
|---------|---------|------|
| 大标题 | `fade-up` + `blur(4px) → blur(0)` | 像灯光亮起 |
| 正文段落 | 纯 `fade-up`，距离 16px | 安静跟随 |
| 图片 | `scale(0.96) → scale(1)` + `rotate(0.5deg) → rotate(0)` | 照片被放下的重量感 |
| 卡片/列表项 | `fade-up` + stagger delay（每项间隔 80ms） | 依次亮相 |
| 价格/数据 | `fade-up` + 从右侧 slight slide | 信息被"递"过来 |

### 视差层次

- **Gallery 页面**：图片卡片滚动速度 `0.95x`，文字 `1x`
- **About 页面**：Story 段落 backdrop-blur 层滚动速度 `0.9x`
- **Menu 页面**：分类标题滚动经过时轻微向左偏移 `translateX(-8px)`

### 导航栏 Active Indicator 滑动

Menu 分类导航的 active indicator 改为 CSS transition 滑动：

```css
transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
```

### 滚动进度指示器升级

在现有 `ReadingProgress` 金线基础上，增加一个 `4px` 宽的亮斑随进度移动：

```css
box-shadow: 0 0 6px rgba(201,162,39,0.6);
```

### 入场时机优化

`ScrollReveal` 阈值按元素类型区分：

- 大元素（Hero、全宽图片）：`threshold: 0.15`
- 小元素（菜单项、文字）：`threshold: 0.05`

---

## 章节 4：各页面具体配合调整

### 首页（Home）

- **Hero 轮播图**：每张图叠加 subtle vignette + 暖色 overlay（`rgba(201,162,39,0.03)`）
- **JournalStream 卡片**：应用新阴影系统 + staggered 入场
- **GuestbookHook**：面板应用新阴影 + 边框精致化；entries 列表增加 stagger delay

### Gallery 页面

- **专辑封面卡片**：统一为新阴影系统；hover 时增加 `brightness(1.05)`
- **视差**：卡片以 `0.95x` 速度滚动
- **图片加载**：统一使用 blur-to-sharp 过渡

### Menu 页面

- **分类导航**：当前项 indicator 滑动 + glow；非当前项 hover 更柔和
- **菜单项**：staggered fade-up（每行间隔 60ms）
- **菜品图片**：hover 时 `scale(1.05) + brightness(1.08)`
- **分类标题**：左侧金条从 `h-6` 细化为 `h-5`，增加 `rounded-full`

### About 页面

- **Aurora 背景**：保留现有实现，在 canvas 之下叠加全局环境光层
- **Story 段落**：backdrop-blur 层应用视差（`0.9x`）
- **Pull Quote**：引号标记增加金色 `text-shadow` 呼吸效果
- **信息卡片**：hover border 加宽动画增加 `transition: border-width 0.3s ease`

### Footer

- **社交图标**：hover 增加 `filter: drop-shadow(0 0 8px rgba(201,162,39,0.3))`
- **底部渐变**：页面内容到 Footer 之间增加 `page-bottom-fade`

---

## 章节 5：性能与无障碍保障

### 性能

- **will-change**：只在动画进行中时使用，动画结束后移除
- **Film grain**：使用 CSS `transform: translate()` 而非 `background-position`
- **视差**：使用 `transform: translateY()` 配合 IntersectionObserver
- **环境光层**：纯 CSS animation，无 JS
- **低端设备回退**：`prefers-reduced-motion` 或 `@media (hover: none)` 时简化效果

### 无障碍

- **`prefers-reduced-motion: reduce`**：
  - Film grain 停止位移动画，保留静态纹理
  - 所有入场动画禁用，元素直接可见
  - 视差效果禁用
  - 导航 indicator 滑动禁用，直接切换
  - 呼吸/闪烁效果全部停止
- **焦点状态**：保持现有 `focus-gold` 焦点环
- **对比度**：环境光层透明度控制在 0.02-0.03，不降低文字对比度

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `app/globals.css` | 修改 | 添加 film grain、环境光层、page-bottom-fade、差异化入场动画 class |
| `components/FadeInImage.tsx` | 修改 | 增加 blur-to-sharp 过渡 |
| `components/ScrollReveal.tsx` | 修改 | 支持按元素类型切换入场效果，支持差异化 threshold |
| `components/GalleryGrid.tsx` | 修改 | 新阴影系统、brightness hover、视差 |
| `components/MenuSection.tsx` | 修改 | stagger delay、图片 brightness hover、分类标题细化 |
| `components/MenuNav.tsx` | 修改 | indicator 滑动过渡、当前项 glow |
| `components/GuestbookHook.tsx` | 修改 | 新阴影系统、边框精致化、stagger |
| `components/ReadingProgress.tsx` | 修改 | 增加亮斑效果 |
| `app/components/pages/AboutPage.tsx` | 修改 | 视差、引号呼吸、信息卡片 transition |
| `app/components/pages/HomePage.tsx` | 修改 | 或相关 Journal 组件增加 stagger |
| `components/Footer.tsx` | 修改 | 社交图标 drop-shadow、底部渐变 |
| `app/(en)/layout.tsx`、`app/zh/layout.tsx` | 修改 | 接入环境光层和 page-bottom-fade |

---

## 兼容性

- **移动端**：视差效果在触摸设备上简化为 `transform` 方案；film grain 保持但降低 opacity 至 0.02
- **暗色/亮色模式**：当前站点无亮色模式切换，所有改动基于暗色背景 `#0a0a0a`
- **减少动画**：`prefers-reduced-motion` 已在各章节中明确覆盖
