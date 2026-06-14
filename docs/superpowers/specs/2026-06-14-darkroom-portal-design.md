# Darkroom Portal：彩蛋入口 + 独立对话页设计

## 目标

为 Dark Side（Darkroom）模式增加一个独立的彩蛋入口页。用户每次切换到 darkroom 模式后，先进入一个独立的"选择界面"，然后分流到：
- **蓝药丸**：进入现有的 Dark Side 首页（表层构造）
- **红药丸**：进入全新的全屏对话终端页（未注册对话扇区）

同时，新对话页提供比首页嵌入式对话框更沉浸、更专注的体验，并保留返回 Dark Side 首页的入口。

## 设计方向

视觉风格参考 **Blade Runner 2049 + 复古 CRT 终端**：
- 黑底 + 低饱和度橙/蓝环境光雾（haze）
- 轻微的全息故障感（glitch text shadow）
- CRT 扫描线和噪点纹理
- 巨大标题 + 极简选项
- 底部反射/潮湿感微光

高亮色采用**冷青色 #4a7a8a**（方案 3），用于系统提示符、信号文字、hover 边框等。药丸保持电影感的暗红/深蓝。

## 入口彩蛋页

### 触发时机
每次用户切换到 `body.darkroom` 模式后，不直接渲染首页，而是先进入彩蛋入口页。选择后通过客户端路由跳转，浏览器后退不可撤销选择（但对话页提供返回首页的入口）。

### URL
- EN: `/darkroom/portal`
- ZH: `/zh/darkroom/portal`

### 页面结构
```
┌─────────────────────────┐
│  SIGNAL 118.7 MHz       │  ← 顶部信号条，小字
│  ORIGIN UNTRACED        │
│  MODE AFTER HOURS       │
├─────────────────────────┤
│                         │
│  THE                    │  ← 巨大标题
│  OTHER                  │
│  SIDE                   │
│                         │
│  你正在看见层之下的层。  │  ← 叙事文字，逐行打字
│  大多数实体从未...       │
│  过滤器已经失效。        │
│                         │
│  [●] 蓝药丸 · 进入表层   │  ← 两个药丸选项
│       Dark Side 主页     │
│                         │
│  [●] 红药丸 · 接入信号   │
│       未注册对话扇区     │
│                         │
├─────────────────────────┤
│  > 等待选择... _         │  ← 终端输入行
├─────────────────────────┤
│  SHANGHAI  JULU RD  2026│  ← 底部 footer
└─────────────────────────┘
```

### 行为
1. 页面加载后，信号条和标题淡入
2. 叙事文字以打字机效果逐行显示（复用现有 `useTypewriter`）
3. 叙事完成后，两个药丸选项从下方滑入/淡入
4. 用户点击药丸后，路由跳转：
   - 蓝药丸 → `/` 或 `/zh`（带 `darkroom` class）
   - 红药丸 → `/darkroom/chat` 或 `/zh/darkroom/chat`

### 视觉细节
- 背景：`#050505` + 橙/蓝径向渐变 haze + 噪点 + 扫描线
- 标题：`38px`、字重 700、行高 1.05、轻微红/蓝 text-shadow 制造 glitch
- 叙事文字：`12px`、冷灰色、左侧 1px 边框
- 药丸：`14×22px`、圆角 `7px`、暗红/深蓝渐变、微弱 glow
- 选项框：`14px 16px` padding、1px `#1a2a3a` 边框、hover 变青色
- 底部 footer：8px 字、SHANGHAI / JULU RD / 2026

## 对话专属页

### URL
- EN: `/darkroom/chat`
- ZH: `/zh/darkroom/chat`

### 页面结构
```
┌─────────────────────────┐
│  ← 返回                  │  ← 左上角返回按钮
│  SIGNAL 118.7 MHz · ... │  ← 顶部居中信标
├─────────────────────────┤
│                         │
│  [02:33:08] · SYSTEM    │  ← 日志式消息流
│  > 检测到未识别...       │
│                         │
│  [02:34:12] · USER INPUT│
│  > Devil 是谁？          │
│                         │
│  [02:34:13] · SYSTEM    │
│  > 找到碎片记录。        │
│                         │
├─────────────────────────┤
│  > 输入指令... _         │  ← 底部输入行
└─────────────────────────┘
```

### 行为
- 复用现有 `DarkroomTerminal` 的核心逻辑：打字机、消息流、API 调用、记忆提取
- 但改为**全屏沉浸**，不再嵌入在首页内容中
- 输入框固定在底部，消息从底部向上增长
- 顶部提供"← 返回"按钮，跳转回 Dark Side 首页
- 不显示记忆流，保持神秘感

### 视觉细节
- 和入口页一致的 BR2049 + CRT 背景
- 消息格式和现有终端一致：`[timestamp] · LOCATION\n> message`
- 用户消息边框用冷青色，系统消息用深灰边框
- 输入行底部固定，带闪烁光标

## 交互与数据流

```
用户触发 darkroom 模式
        │
        ▼
┌───────────────┐
│ /darkroom/portal │  ← 彩蛋入口页
└───────────────┘
        │
   选择蓝药丸 ────────────→ / 或 /zh （现有 Dark Side 首页）
        │
   选择红药丸 ────────────→ /darkroom/chat （新对话页）
                                │
                                ▼
                        复用 sendDarkroomMessage
                        调用 /api/darkroom/chat
                        调用 /api/darkroom/extract
                                │
                                ▼
                        点击 ← 返回 ──→ / 或 /zh
```

## URL 与路由

新增页面：

| 页面 | 路由 | 类型 |
|------|------|------|
| 入口彩蛋页 | `/darkroom/portal` | Client Component |
| 入口彩蛋页（中文） | `/zh/darkroom/portal` | Client Component |
| 对话专属页 | `/darkroom/chat` | Client Component |
| 对话专属页（中文） | `/zh/darkroom/chat` | Client Component |

## 实现要点

### 复用与拆分
- 现有 `components/DarkroomTerminal.tsx` 逻辑-heavy，建议拆出：
  - `useDarkroomChat`：聊天 state、API 调用、history 管理
  - `DarkroomChatUI`：纯展示组件，支持全屏/嵌入两种模式
- `DarkroomTerminal` 改为组合：`DarkroomChatUI` + 嵌入模式样式
- 新页面 `app/(en)/darkroom/chat/page.tsx` 使用全屏模式

### 入口页实现
- 新组件 `components/DarkroomPortal.tsx`
- 使用 `next/navigation` 的 `useRouter` 做客户端跳转
- 打字机效果复用现有的 `useTypewriter`
- 动画序列：信号条淡入 → 标题淡入 → 叙事打字 → 选项滑入

### 视觉样式
- 新建 `app/darkroom-portal.css` 或在 `globals.css` 内增加 `body.darkroom-portal` 相关样式
- 背景效果用 CSS：多层 radial-gradient + repeating-linear-gradient + SVG noise
- 移动端优先，所有尺寸基于 `max-width: 375px` 设计，大屏居中放大

### 切换逻辑
- 现有切换 darkroom 模式的代码需要改：触发后导航到 `/darkroom/portal` 而不是直接加 class
- 从 portal 进入首页后再加 `body.darkroom` class
- 对话页本身不需要 `body.darkroom`，它自己就是全屏 dark 风格

## 移动端适配

- 所有尺寸按 iPhone 375×812 为基准设计
- 标题在更小的屏幕上缩小到 `32px`
- 选项保持可点击区域 ≥ 44px 高度
- 输入框固定在底部，避免键盘弹起时被顶飞
- 全屏对话页不需要滚动页面，只需消息区域内滚动

## 关键文件

- `app/(en)/darkroom/portal/page.tsx`：英文入口页
- `app/zh/darkroom/portal/page.tsx`：中文入口页
- `app/(en)/darkroom/chat/page.tsx`：英文对话页
- `app/zh/darkroom/chat/page.tsx`：中文对话页
- `components/DarkroomPortal.tsx`：入口彩蛋组件
- `components/DarkroomChat.tsx`：可复用的全屏/嵌入对话组件
- `components/DarkroomTerminal.tsx`：改为基于 DarkroomChat 的嵌入版本
- `lib/darkroom.ts`：如有必要，调整 API 调用逻辑
- `app/globals.css`：新增 portal + fullscreen chat 样式

## 风险与注意事项

1. **URL 结构变化**：当前 Dark Side 是 `body.darkroom` 切换的伪路由，新增真实路由后，需要确保普通模式不会访问这些页面。
2. **SSR 问题**：portal 和 chat 都是 Client Component，需要 `use client`。
3. **返回逻辑**：对话页返回首页时，需要确保 `body.darkroom` class 仍然存在。
4. **记忆系统不变**：对话页继续复用 `/api/darkroom/chat` 和 `/api/darkroom/extract`，数据层无需改动。
