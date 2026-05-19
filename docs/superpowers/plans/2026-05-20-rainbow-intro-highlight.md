# 彩虹高亮 Intro 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 hero intro 中给指定短语加上斜向彩虹渐变 + 缓慢流动动画(EN: `MUCH MORE`,ZH: `全是朋友`),作为 gay bar 的视觉暗示;通过 JSON 中的 `[[...]]` 标记把样式和内容解耦。

**Architecture:** 在 `data/site.json` 的 `intro`/`introZh` 字段用 `[[短语]]` 标记需要高亮的段;`HeroCarousel` 中加一个 `renderIntro` 辅助函数,把字符串按 `[[...]]` 切分,被包裹的段套上 `.rainbow-text` 样式,其余原样输出。CSS 用 `background-clip: text` + `background-position` 动画实现彩虹流动,`prefers-reduced-motion` 下静止。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4 (内联 styled-jsx)

**Verification:** 项目无单元测试框架,采用 `npx tsc --noEmit` + ESLint + 本地 dev server 在浏览器手工验证 EN/ZH 两版渲染。

---

## 文件结构映射

| 文件 | 改动 |
|------|------|
| `data/site.json` | `intro` / `introZh` 两个字段中,把高亮短语包成 `[[短语]]` |
| `components/HeroCarousel.tsx` | 新增 `renderIntro(text)` 辅助函数;将 intro 渲染处由 `{intro}` 换成 `{renderIntro(intro)}`;在内联 `<style jsx>` 中追加 `.rainbow-text` 规则、`@keyframes rainbowFlow` 关键帧、以及 `prefers-reduced-motion` 媒体查询 |

---

### Task 1: 在 `data/site.json` 中标记高亮短语

**Files:**
- Modify: `data/site.json:6-7`

- [ ] **Step 1: 把 EN/ZH intro 中要彩虹高亮的短语用 `[[...]]` 包起来**

打开 `data/site.json`,把这两行:
```json
  "intro": "Tea, Wine, Cocktails, and MUCH MORE",
  "introZh": "小酒吧，啥都有，全是朋友",
```
改为:
```json
  "intro": "Tea, Wine, Cocktails, and [[MUCH MORE]]",
  "introZh": "小酒吧，啥都有，[[全是朋友]]",
```

- [ ] **Step 2: 验证 JSON 仍可解析**

Run: `python3 -c "import json; json.load(open('data/site.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: 提交**

```bash
git add data/site.json
git commit -m "content: mark intro highlight phrases with [[...]] for rainbow rendering"
```

---

### Task 2: 在 `HeroCarousel.tsx` 中加 `renderIntro` 辅助函数并接入 JSX

**Files:**
- Modify: `components/HeroCarousel.tsx` (intro `<p>` 周围)

- [ ] **Step 1: 阅读现有 intro 渲染位置**

Run: `grep -n "{intro}" components/HeroCarousel.tsx`
Expected: 命中一行,大约位于 line 103,内容形如:
```tsx
        <p className="hero-intro-fade-up text-base tracking-wide text-[#f5f5f0] md:text-lg lg:text-xl">
          {intro}
        </p>
```

- [ ] **Step 2: 在组件函数顶部(`export default function HeroCarousel` 内、`return` 之前)添加 `renderIntro` 辅助函数**

把已有的 `return (` 前一行加一个空行,然后插入这个函数:

```tsx
  function renderIntro(text: string) {
    return text.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
      part.startsWith('[[') && part.endsWith(']]')
        ? <span key={i} className="rainbow-text">{part.slice(2, -2)}</span>
        : part
    );
  }
```

说明:`split` 用捕获组保留分隔符,被捕获的 `[[...]]` 段进入数组中作为独立 item,从而能整体替换成 `<span>`。

- [ ] **Step 3: 把 `{intro}` 替换为 `{renderIntro(intro)}`**

定位到 intro 的 `<p>` 标签:
```tsx
        <p className="hero-intro-fade-up text-base tracking-wide text-[#f5f5f0] md:text-lg lg:text-xl">
          {intro}
        </p>
```
改为:
```tsx
        <p className="hero-intro-fade-up text-base tracking-wide text-[#f5f5f0] md:text-lg lg:text-xl">
          {renderIntro(intro)}
        </p>
```

- [ ] **Step 4: typecheck 通过**

Run: `cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit`
Expected: 无输出,无错误。

- [ ] **Step 5: dev server 上 EN/ZH 页都能 200**

Run:
```bash
curl -s -o /dev/null -w "EN %{http_code}\n" http://localhost:3001/
curl -s -o /dev/null -w "ZH %{http_code}\n" http://localhost:3001/zh/
```
Expected:
```
EN 200
ZH 200
```

- [ ] **Step 6: 验证渲染中的 span**

Run: `curl -s http://localhost:3001/ | grep -o 'rainbow-text[^"]*"' | head -3`
Expected: 至少一行包含 `rainbow-text`,且页面文字里看不到原始 `[[` 或 `]]`(短语显示为干净的「MUCH MORE」)。也可附加验证:`curl -s http://localhost:3001/ | grep -c '\[\['` 应为 `0`。

- [ ] **Step 7: 提交**

```bash
git add components/HeroCarousel.tsx
git commit -m "feat: render [[...]] markers in hero intro as rainbow-text spans"
```

---

### Task 3: 加 `.rainbow-text` 样式 + 流动动画 + 无障碍开关

**Files:**
- Modify: `components/HeroCarousel.tsx` (内联 `<style jsx>` 块,大约 line 48 起的位置)

- [ ] **Step 1: 找到现有的 `@keyframes` 区域**

Run: `grep -n "@keyframes\|prefers-reduced-motion\|<style jsx" components/HeroCarousel.tsx`
Expected: 命中现有的 `<style jsx global>`(或类似)块,以及 `taglineShimmer`、`heroIntroFadeUp`、`scrollHintBounce` 三个关键帧,和一个 `@media (prefers-reduced-motion: reduce)` 块。

- [ ] **Step 2: 在 `<style jsx>` 块中新增 `.rainbow-text` 规则,放在已有 `.scroll-hint` 规则之后、`@media (prefers-reduced-motion: reduce)` 之前**

```css
        .rainbow-text {
          font-weight: 600;
          background-image: linear-gradient(60deg,
            #ff3d6e 0%,  #ff8a2e 16%, #ffe14d 33%,
            #2ed47a 50%, #4fb3ff 66%, #b46cff 83%,
            #ff3d6e 100%);
          background-size: 300% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: rainbowFlow 10s linear infinite;
          text-shadow: 0 0 1px rgba(255, 255, 255, 0.15);
        }
        @keyframes rainbowFlow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
```

要点:
- 渐变首尾色都是 `#ff3d6e`,确保 `background-position` 走完一轮没有可见接缝
- `background-size: 300% 100%` + 0% → 300% 平移 = 完整循环
- `text-shadow` 提供细微白色光晕,保证高亮黄段在深 hero 图上不糊

- [ ] **Step 3: 在已有的 `@media (prefers-reduced-motion: reduce)` 块里加一行,关闭 `.rainbow-text` 的动画**

定位:
```css
        @media (prefers-reduced-motion: reduce) {
          .tagline-shimmer { animation: none !important; -webkit-mask-image: none !important; mask-image: none !important; }
          .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .scroll-hint { animation: none !important; }
        }
```
改为(在 `.scroll-hint` 那行后面新增一行):
```css
        @media (prefers-reduced-motion: reduce) {
          .tagline-shimmer { animation: none !important; -webkit-mask-image: none !important; mask-image: none !important; }
          .hero-intro-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
          .scroll-hint { animation: none !important; }
          .rainbow-text { animation: none !important; }
        }
```

- [ ] **Step 4: typecheck 通过**

Run: `cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 5: 在 dev server 上肉眼验证**

打开 http://localhost:3001/ 和 http://localhost:3001/zh/,确认:
- EN 首页 hero intro 显示 `Tea, Wine, Cocktails, and MUCH MORE`,其中 `MUCH MORE` 呈彩虹斜向渐变并缓慢流动
- ZH 首页 hero intro 显示 `小酒吧，啥都有，全是朋友`,其中 `全是朋友` 呈彩虹斜向渐变并缓慢流动
- 流动周期约 10 秒,无可见接缝
- 不出现裸 `[[` 或 `]]` 字符
- 系统设置开「减少动态效果」后(macOS: System Settings → Accessibility → Display → Reduce Motion),彩虹仍显示但停止流动

- [ ] **Step 6: 提交**

```bash
git add components/HeroCarousel.tsx
git commit -m "style: rainbow gradient + flow animation for highlighted intro phrase"
```

---

### Task 4: 发布

**Files:** (无新增)

- [ ] **Step 1: 工作树检查**

Run: `git status`
Expected: `nothing to commit, working tree clean`

- [ ] **Step 2: 推到 origin/main**

```bash
git push origin main
```
Expected: 三个新 commit(`content:` `feat:` `style:`)被推送,Vercel 自动开始部署。

- [ ] **Step 3: 部署完成后线上验证**

在 jiuwoshanghai.net 主页和 /zh 主页上重复 Task 3 Step 5 的肉眼验证。Mobile Safari 需要测一次(`-webkit-background-clip: text` + `-webkit-text-fill-color: transparent` 这两个前缀在 iOS Safari 上是必需的)。

---

## 不在范围内

- 其它读取 `intro` / `introZh` 的地方(目前只有 `HeroCarousel`,没有第二个消费者)
- tagline 样式(`taglineShimmer` 不变)
- 给更多短语加高亮(`[[...]]` 机制已通用,后续可在 JSON 里再加,不需要改组件)
- 任何 `lib/data.ts` 类型变更(`intro` 仍是 `string`)
