# Menu 页面视觉与动效优化设计文档

## 概述

优化 Menu 页面的视觉呈现和动效，提升整体精致感。以文字为主、图片辅助，保持和全站（首页 Journal、Gallery）一致的视觉语言。

---

## 设计原则

1. **文字为主** — 名称和价格两端对齐，描述辅助，图片保持 64×64 辅助角色
2. **与全站统一** — 金色装饰线、scroll-reveal、金色竖线标记等视觉元素和 Journal/Gallery 保持一致
3. **透气留白** — 去掉实线分隔，改用留白区分菜品
4. **降低运动偏好尊重** — 所有动画支持 `prefers-reduced-motion: reduce` 降级

---

## Part 1：标题区域 + 分类导航栏

### 1.1 标题区域

- 居中大标题 + 两侧渐变装饰线（与 Gallery 列表页完全一致）
- 装饰线：`flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]`
- 标题 `shrink-0` 防止被压缩
- 副标题居中，`text-sm text-[#a0a0a0]`

### 1.2 分类导航栏

**布局：**
- 粘性定位保留（`sticky top-16 z-40`）
- 背景 `bg-[#0a0a0a]/95 backdrop-blur-sm`
- 底部边框 `border-b border-[#222]`

**Pill 风格按钮：**
- 当前 active 分类：文字金色，下方有一条 2px 金色细线（`h-0.5 bg-[#c9a227] rounded-full`）
- 非 active：灰色文字 `text-[#a0a0a0]`，hover 时文字变金色 + 细线从中心向两边展开（`scale-x-0 → scale-x-100`）
- 细线动画 duration 300ms，`ease-out`，origin 居中

**横向滚动提示：**
- 导航栏容器增加左右渐变遮罩：
  ```css
  -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
  mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
  ```

---

## Part 2：分类标题 + 菜品卡片排版

### 2.1 分类标题

- 左侧加金色竖线装饰（与 Journal 时间标签统一风格）
- 竖线：`w-1 h-6 bg-[#c9a227] rounded-full`
- 标题：`text-2xl font-medium text-[#a0a0a0] tracking-wide`

### 2.2 菜品卡片重构

**布局：**
```
[图片 64×64]  [名称]                        [价格 CNY xxx]
              [描述 灰色小字]
```

- 图片保持在最左侧，64×64，圆角从 `rounded-md` 改为 `rounded-lg`
- 名称和价格 **同一行两端对齐**（`justify-between`）
- 名称：`text-base font-medium text-[#f5f5f0]`
- 价格：`text-sm font-medium text-[#c9a227] whitespace-nowrap`
- 描述在第二行：`text-sm text-[#a0a0a0] mt-1.5 leading-relaxed`

**分隔方式：**
- 去掉 `border-b border-[#222]`
- 改用 `pb-6 mb-6` 留白分隔，更透气

---

## Part 3：入场动画 + 交互细节

### 3.1 分类区块入场（Scroll Reveal）

- 使用已有的 `ScrollReveal` 共享组件
- 每个分类区块：`opacity: 0→1` + `translateY(24px)→0`，duration 600ms
- 同一分类内的菜品 stagger 60ms（依次浮现）

### 3.2 菜品图片交互反馈

- 桌面 hover：`scale(1.05)`，duration 300ms
- 移动端 tap：`active:scale-[0.98]`

### 3.3 平滑滚动

- 点击导航栏分类时，smooth scroll 到对应区块
- 已有 `scroll-mt-32`，保持不变

### 3.4 可访问性

- `prefers-reduced-motion: reduce` 时禁用所有动画，直接显示
- 导航栏链接保持正确的 `href` 和 focus 状态

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/components/pages/MenuPage.tsx` | 修改 | 标题区域加装饰线 |
| `components/MenuNav.tsx` | 修改 | 导航栏改为 pill 风格 + 下划线动画 + 渐变遮罩 |
| `components/MenuSection.tsx` | 修改 | 分类标题加金色竖线，菜品卡片重构排版 + scroll-reveal |
| `components/ScrollReveal.tsx` | 无需修改 | 复用已有组件 |
