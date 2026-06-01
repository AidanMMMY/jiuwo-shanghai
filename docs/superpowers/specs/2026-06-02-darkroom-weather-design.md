# After Hours 暗房模式 + 天气联动设计

## 背景与目标

在全局氛围沉浸化改造完成后，增加两个增强体验的功能：
1. **After Hours 暗房模式** — 一个 Easter egg，让用户发现网站的"另一面"
2. **天气联动推荐** — 根据上海实时天气，在首页推荐酒和氛围

---

## Feature 1: After Hours 暗房模式

### 触发方式

导航栏左上角 logo，1 秒内连续快速点击 5 次触发。

**进度反馈：** 每点击一次，logo 轻微放大（scale 1.1 → 1.0，100ms），给用户即时反馈。

**防误触：** 1 秒内未点满 5 次，计数器重置。

### 进入动画

1. **白闪**（100ms）：全屏 `background: white` 覆盖，然后淡出
2. **褪色**（1.2s）：页面内容逐渐变成高对比度黑白
3. **字体切换**（0.5s）：文字从 Bodoni 切换成 Space Mono
4. **浮现文字**（3s 后淡出）：屏幕中央显示 *"The lights are off. The chairs are up. This is JIUWO after 2am."*

### 视觉变化

| 元素 | 正常模式 | After Hours |
|------|----------|-------------|
| 背景 | #0a0a0a | #030303 |
| 主文字 | #f5f5f0 | #e8e8d0 |
| 强调色 | #c9a227（金） | #a0a0a0（银灰） |
| 图片 | 正常彩色 | grayscale(100%) contrast(1.3) |
| 字体 | Bodoni / Inter | Space Mono / Inter |
| 卡片边框 | 渐变 subtle | 1px 实线 #333 |
| 滚动条 | 默认 | 极简白线 2px |

### 内容变化

- **Hero 标题**：JIUWO → "JIUWO — After Hours"
- **底部图标**：茶叶/酒杯/摇酒壶/爱心 → 锁/椅子/空杯/月亮（暗房专用 SVG 图标）
- **隐藏入口**：GuestbookHook 区域出现一个额外的链接 *"Leave a message for the night shift"*，只有 After Hours 模式可见
- **JournalStream**：文章标题旁增加时间戳 *"Posted at 1:47am"*

### 退出方式

- 再次点击 logo 5 次，逆向动画返回
- 刷新页面自动返回正常模式
- localStorage 记住状态（`jiuwo-darkroom: true/false`）

### 无障碍

- `prefers-reduced-motion`：跳过白闪和褪色动画，直接切换
- 进入/退出动画期间，所有交互禁用（防止误操作）

---

## Feature 2: 天气联动推荐（Today's Vibe）

### 位置

首页 JournalStream 上方，一块独立的推荐卡片。

### 视觉设计

```
┌─────────────────────────────────────────┐
│  ☁️  Shanghai  22°C  ·  Cloudy          │
│                                         │
│  "阴天适合坐在吧台最左边，               │
│   看调酒师工作，来杯泥煤威士忌。"        │
│                                         │
│  → Try: Laphroaig 10 / 吧台座位         │
└─────────────────────────────────────────┘
```

- 宽度：max-w-3xl 居中
- 背景：#0e0e0e 带 subtle 边框
- 天气图标：极简线条 SVG，根据天气动态变化

### 天气 → 推荐映射

| WMO Weather Code | 天气 | 推荐酒 | 推荐氛围 |
|------------------|------|--------|----------|
| 0, 1 | 晴 | 金汤力 / 白葡萄酒 | 露台座位，golden hour |
| 2, 3 | 多云 | 泥煤威士忌 | 吧台最左边的位子 |
| 45, 48 | 雾 | 热茶 / 低度酒 | 角落里的单人沙发 |
| 51-55, 61-65, 80-82 | 雨 | 热托蒂 / 岩茶 | 靠窗的高脚台，听雨 |
| 95-99 | 雷雨 | 短饮鸡尾酒 | 吧台正中央 |
| 71-77, 85-86 | 雪/雨夹雪 | 热红酒 | 室内最深处，背靠墙 |

### 数据来源

[Open-Meteo API](https://open-meteo.com/) — 免费、无需 API Key。

请求：
```
https://api.open-meteo.com/v1/forecast?latitude=31.2304&longitude=121.4737&current_weather=true&timezone=Asia/Shanghai
```

### 技术实现

- Next.js Server Component 获取天气数据
- 缓存 30 分钟（`revalidate = 1800`）
- 失败时静默降级，不显示推荐卡（避免空状态破坏页面）

### 双语

- EN 版本：英文推荐文案
- ZH 版本：中文推荐文案
- 天气描述（晴/雨等）根据语言切换

---

## 文件变更清单

| 文件 | 变更 | 说明 |
|------|------|------|
| `components/Navbar.tsx` | 修改 | 添加 logo 点击计数器、暗房模式切换逻辑 |
| `app/globals.css` | 修改 | 添加暗房主题 CSS 变量、白闪动画、褪色动画 |
| `components/HeroCarousel.tsx` | 修改 | 支持暗房模式内容切换（标题、图标） |
| `components/GuestbookHook.tsx` | 修改 | 添加暗房模式隐藏入口 |
| `app/layout.tsx` | 修改 | 添加暗房模式主题 class 切换 |
| `app/components/pages/HomePage.tsx` | 修改 | 接入天气推荐组件 |
| `components/WeatherVibe.tsx` | 新增 | 天气联动推荐卡片组件 |
| `app/(en)/page.tsx` | 修改 | 获取天气数据并传给 HomePage |
| `app/zh/page.tsx` | 修改 | 获取天气数据并传给 HomePage |
| `lib/weather.ts` | 新增 | Open-Meteo API 封装 + 天气映射逻辑 |
| `data/weather-messages.json` | 新增 | 双语天气推荐文案 |
