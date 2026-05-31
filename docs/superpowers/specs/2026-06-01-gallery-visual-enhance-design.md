# Gallery 页面视觉与动效优化设计文档

## 概述

对 Gallery 列表页、相册明细页及 Lightbox 进行视觉和动效优化，提升整体质感。优化方向以移动端体验优先，在保持现有布局结构的基础上增加精致化的动画和交互细节。

---

## 设计原则

1. **移动端优先** — 所有动效在移动端性能友好，hover 效果均有对应的 tap/active 回退
2. **与首页统一** — 装饰线、scroll-reveal、金色元素等视觉语言与首页 Journal/GuestbookHook 区域保持一致
3. **渐进增强** — 不改动核心布局，专注于在现有架构上增加动效层次
4. **降低运动偏好尊重** — 所有动画支持 `prefers-reduced-motion: reduce` 降级

---

## Part 1：Gallery 列表页

### 1.1 标题区域

- 居中大标题 + 两侧渐变装饰线（与首页 Journal 区块统一）
- 装饰线：`bg-gradient-to-r from-transparent via-[#333] to-[#333]`
- 副标题（如有）放在标题下方，text-sm，text-[#a0a0a0]

### 1.2 相册卡片入场动画（Scroll Reveal）

- 使用 IntersectionObserver，threshold 0.05（移动端更早触发）
- 每张卡片：`opacity: 0→1` + `translateY(24px)→0`，duration 600ms
- stagger：100ms（逐张依次出现）
- easing：`cubic-bezier(0.16, 1, 0.3, 1)`
- 降级：`prefers-reduced-motion: reduce` 时直接显示，无动画

### 1.3 卡片交互反馈

**桌面 hover：**
- 图片：`scale(1.02)` + 亮度微提（`brightness(1.05)`）
- 阴影层：现有的 translate 位移效果保留
- 标题区域：从底部滑入更明显

**移动端 tap：**
- 移除 hover 依赖
- `:active` 状态时图片微缩 `scale(0.98)` + 亮度变化
- 触摸反馈 duration 150ms

### 1.4 照片计数徽章

- 保持右上角圆角 badge
- 增加 `backdrop-blur-sm` 提升质感

---

## Part 2：相册明细页

### 2.1 头部区域

- 返回按钮：左侧箭头 + "Back to Gallery"
- hover/tap 时箭头左移 4px + 文字变金色
- 标题下方加金色渐变装饰线（与列表页一致）
- FriendSocialBar 保持现有位置，增加 subtle 的 hover 反馈

### 2.2 照片网格入场动画

- 每张照片 scroll-reveal，stagger 60ms
- 动画：`opacity: 0→1` + `translateY(20px)→0` + `scale(0.98)→1`
- duration 500ms
- easing：`cubic-bezier(0.16, 1, 0.3, 1)`

### 2.3 照片交互反馈

**桌面 hover：**
- 图片 `scale(1.03)` + 亮度微提
- LikeButton 区域：默认 `opacity-70`，hover 时 `opacity-100`

**移动端：**
- `:active` 时微缩 + 亮度变化
- LikeButton 始终可见（不依赖 hover）

### 2.4 双击点赞

- 保持现有 300ms 定时器区分单击/双击
- 金色心形弹出动画保留（`heartPop` keyframes）
- 与右下角 LikeButton 状态同步（受控模式）

---

## Part 3：Lightbox

### 3.1 无缝放大过渡（核心效果）

**打开动画：**
1. 点击缩略图时，通过 `getBoundingClientRect` 记录该图片在屏幕上的精确位置
2. 创建"飞行图片"（`position: fixed` 的 `img` 元素），初始状态完全覆盖原缩略图
3. 飞行图片动画到屏幕中央并缩放到 Lightbox 尺寸：
   - `translate`：从原位置到屏幕中心
   - `scale`：从缩略图尺寸到 Lightbox 展示尺寸
   - duration 400ms
   - easing：`cubic-bezier(0.16, 1, 0.3, 1)`
4. 背景同步淡入（`bg-black/0 → bg-black/95`）
5. 动画完成后，隐藏飞行图片，显示真正的 Lightbox embla carousel（从对应索引开始）

**关闭动画（反向）：**
1. 获取当前显示照片的缩略图位置（通过 photo.src 匹配 DOM 中的对应缩略图）
2. 如果缩略图在视口内：执行反向飞回动画（从中心缩小到缩略图位置）
3. 如果缩略图不在视口内：直接淡出（opacity 1→0），不执行飞回
4. 背景同步淡出

**实现细节：**
- 飞行图片使用原图的 `src`，避免加载新资源
- 使用 `FLIP` 动画技术（First / Last / Invert / Play）
- 动画期间禁用交互，防止快速点击导致状态混乱

### 3.2 UI 精致化

**关闭按钮：**
- 圆形按钮：`w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm`
- hover：`bg-[#c9a227]/20 text-[#c9a227]`
- 图标：精致的 ×（SVG，2px stroke）

**左右箭头（仅桌面端）：**
- 同样的圆形按钮样式
- 移动端隐藏（依赖滑动）

**底部信息栏：**
- 统一圆角条：`rounded-full bg-black/40 backdrop-blur-md px-5 py-2`
- 内容：页码（"3 / 12"）+ LikeButton
- 页码样式：text-xs，text-[#a0a0a0]，tabular-nums

**照片切换淡入：**
- embla 滑动时，新照片从 `opacity: 0.7` 到 `1`
- transition 300ms，与滑动同步

### 3.3 下滑关闭手势（移动端）

- 在 Lightbox 内容区域监听 touch 事件
- 垂直滑动超过 100px 且速度足够时触发关闭
- 滑动过程中背景 opacity 随滑动距离降低
- 释放时如果超过阈值则关闭，否则回弹

### 3.4 滑动提示

- 首次打开 Lightbox 时，底部短暂显示滑动提示文字
- "滑动切换照片 · 下滑关闭"
- 3 秒后自动淡出，不再显示
- 使用 `localStorage` 记录是否已显示过

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/components/pages/GalleryPage.tsx` | 修改 | 标题区域增加装饰线 |
| `components/GalleryGrid.tsx` | 修改 | scroll-reveal 入场动画，tap 反馈 |
| `app/components/pages/GalleryAlbumPage.tsx` | 修改 | 标题区域装饰线，返回按钮动画 |
| `components/AlbumPhotoGrid.tsx` | 修改 | scroll-reveal，tap 反馈 |
| `components/Lightbox.tsx` | 重写 | 无缝放大过渡，UI 精致化，下滑关闭 |
| `components/GuestbookHook.tsx` | 无需修改 | — |
| `app/globals.css` | 修改 | 新增/更新动画 keyframes |

---

## 性能考量

1. **FLIP 动画**使用 `transform` 和 `opacity`，仅触发 compositor 层，不引起 layout/reflow
2. **IntersectionObserver** 在组件 unmount 时 disconnect，避免内存泄漏
3. **飞行图片**使用已有 `src`，不触发额外网络请求
4. **下滑关闭**使用 passive touch listener，不阻塞滚动

## 可访问性

1. `prefers-reduced-motion: reduce` 时所有动画禁用，直接显示最终状态
2. 所有交互元素保持可键盘操作
3. Lightbox 打开时焦点管理（聚焦到关闭按钮）
