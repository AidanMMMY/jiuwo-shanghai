# About 页面液态流光背景设计文档

## 概述

为 About 页面增加全屏 Canvas 液态流光背景，营造沉浸式氛围。流光为暗金色，极低 opacity，不干扰文字阅读。配合区块 hover 光效交互，整体提升页面的视觉张力。

---

## 设计原则

1. **氛围优先** — 流光为背景服务，文字内容始终清晰可读
2. **性能友好** — 自动降级、暂停机制、帧率自适应
3. **降低运动尊重** — `prefers-reduced-motion: reduce` 时完全禁用

---

## Part 1：液态流光背景系统

### 技术方案

- 全屏 `<canvas>` 固定在页面最底层（`fixed inset-0 z-0`）
- React 组件 `AuroraBackground` 管理 Canvas 生命周期
- `requestAnimationFrame` 渲染，60fps
- 组件卸载时清理动画帧

### 光带设计

- 3 条独立流动光带，覆盖整个视口
- 每条光带由贝塞尔曲线（`quadraticCurveTo`）绘制
- 控制点缓慢移动，形成有机流动感
- 颜色：`rgba(201, 162, 39, 0.12)` → `rgba(26, 20, 8, 0)`
- 光带宽度 200-400px，边缘 `shadowBlur` 柔化

### 时间动画

- 每条光带独立速度和方向
- 周期 15-25s，异步流动
- `Math.sin(time * speed + offset)` 驱动控制点

### 滚动响应

- 监听 `scroll` 事件（passive）
- 滚动速度影响光带垂直扭曲
- lerp 平滑过渡

---

## Part 2：文字可读性 + 区块交互光效

### 文字可读性

- 内容区块外层增加 subtle 遮罩：
  - 一般区块：`bg-[#0a0a0a]/40 backdrop-blur-[1px]`
  - Story 段落：`bg-[#0a0a0a]/60 backdrop-blur-[2px] rounded-lg p-8`

### 区块交互光效

- **Hero 标题**：`text-shadow: 0 0 40px rgba(201,162,39,0.3)`
- **Pull Quote**：hover 时 `brightness-110`，引号变亮
- **信息栏**：hover 时竖线加粗发光，`bg-[#c9a227]/5`
- **地图边框**：hover 时金色边框亮度脉动

---

## Part 3：性能与降级

### 性能优化

- `willReadFrequently: false`
- `document.hidden` 时暂停动画
- `devicePixelRatio` 上限为 2
- 帧率自适应：渲染超时自动降低光带数量

### 降级策略

- `prefers-reduced-motion: reduce` → 纯黑背景
- 移动端低核心数 → 光带减半
- Safari 低电量 → 自动降级

---

## 文件变更

| 文件 | 变更 |
|------|------|
| `components/AuroraBackground.tsx` | 新建 — Canvas 液态流光背景 |
| `app/components/pages/AboutPage.tsx` | 修改 — 引入背景，增加遮罩和 hover 光效 |
