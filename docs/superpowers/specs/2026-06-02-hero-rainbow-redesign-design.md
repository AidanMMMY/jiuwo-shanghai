# Hero 区域重构设计 — 暗调彩虹标题 + 图标行

## 背景与目标

当前首页 Hero 区域以轮播图为背景，中央是金色流动的 "JIUWO" 大标题，底部有文字 "Tea, Wine, Cocktails, and [[MUCH MORE]]"。

本次重构的目标：
1. 将 "JIUWO" 标题改为暗调彩虹色流动，作为视觉焦点和含蓄的 queer 社区信号
2. 用图标行替代底部文字描述，减少 Hero 区域文字密度
3. 彩虹色集中在标题一处，Hero 其他元素回归中性克制

---

## 改动 1：JIUWO 标题 — 暗调彩虹流动

### 视觉规格

- **技术**：CSS `background-clip: text` + `-webkit-text-fill-color: transparent`
- **字体**：保持 `var(--font-bodoni), Georgia, serif`，`fontWeight: 700`
- **字号**：保持现有响应式 `text-6xl md:text-8xl lg:text-9xl`，`tracking-[0.14em]`
- **文字阴影**：保持 `0 2px 20px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.3)` 确保轮播图上的可读性

### 彩虹渐变定义

```css
background-image: linear-gradient(105deg,
  #8B1A4F 0%,      /* 酒红 */
  #C45A1A 17%,     /* 琥珀 */
  #C9A227 34%,     /* 金色 */
  #5A6B3A 51%,     /* 橄榄 */
  #1E4A6E 68%,     /* 深蓝 */
  #6B3A7A 85%,     /* 深紫 */
  #8B1A4F 100%     /* 回酒红 */
);
background-size: 400% 100%;
```

### 动画参数

- **入场动画**：`titleEntrance` 保持原有（900ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 200ms delay）
- **呼吸动画**：`titleBreathe` 保持原有（5s ease-in-out infinite, 1.2s delay）
- **彩虹流动**：`rainbowFlow` 循环动画
  - 周期：`12s linear infinite`（比原金色 shine 的 4s 更慢，更沉稳）
  - 初始 delay：`1.6s`（等待入场完成后开始流动）
  - Keyframes：`0% { background-position: 0% 50%; }` → `100% { background-position: 400% 50%; }`

### 减少动画偏好（无障碍）

```css
@media (prefers-reduced-motion: reduce) {
  .hero-title-shine { animation: none !important; background-position: 0% 50%; }
}
```

---

## 改动 2：底部饮品图标行

### 视觉规格

- **位置**：Hero 底部居中，绝对定位 `bottom: 4rem`
- **布局**：Flex row，横向排列，`gap: 1.5rem`（`gap-6`），水平居中
- **图标风格**：极简线条 SVG，统一 `stroke="#f5f5f0"`，`strokeWidth="1.5"`，尺寸 `28×28`
- **省略号**：`···` 文字，颜色 `#f5f5f0`，无特殊效果

### 图标选择

| 序号 | 含义 | 图形描述 |
|------|------|----------|
| 1 | Tea | 茶叶轮廓（两片叶子，带叶脉线条） |
| 2 | Wine | 高脚红酒杯（杯身 + 杯柄 + 底座） |
| 3 | Cocktails | 摇酒壶（三段式轮廓） |
| 4 | More | 省略号 `···`（纯文字，off-white） |

### 入场动画

- **动画**：`heroIntroFadeUp` 保持原有（1400ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 1000ms delay）
- **减少动画**：同现有 `.hero-intro-fade-up` 的 reduce-motion 处理

### 数据来源

图标直接内嵌为 SVG 组件，不再解析 `site.json` 的 `intro` 字段。英文和中文版共用同一套图标（纯图形，无文字差异）。

---

## 改动 3：颜色克制

### HeroCarousel 内部

- **移除** `.rainbow-text` CSS 类定义及 `rainbowFlow` keyframe
- **移除** `renderIntro` 函数中对 `[[...]]` 标记的彩虹解析逻辑
- 底部 intro 区域不再渲染来自 `site.json` 的 `intro`/`introZh` 文字
- 图标行替代原有 intro 文字，颜色统一为 `#f5f5f0`

### 全局影响

- **彩虹色仅存在于 JIUWO 标题一处**，成为 Hero 唯一的色彩焦点
- 金色 `#c9a227` 保留用于：scroll hint 箭头、导航 hover、页面分割线、pull-quote 装饰线等结构性点缀
- 红色 `red-400` 保留用于表单验证等纯功能性错误提示

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `components/HeroCarousel.tsx` | 修改 | 替换 `.hero-title-shine` 渐变、移除 `.rainbow-text`、替换底部 intro 为图标行 |
| `data/site.json` | 可选保留 | `intro`/`introZh` 字段不再被 HeroCarousel 读取，可保留供其他用途或标注废弃 |

---

## 兼容性

- **移动端**：图标行在窄屏下横向排列保持可读，图标尺寸 `28px` 适合触控目标
- **暗色/亮色模式**：当前站点无亮色模式切换，所有颜色基于暗色背景 `#0a0a0a`
- **减少动画**：`prefers-reduced-motion` 已在现有代码中覆盖标题和图标行动画
