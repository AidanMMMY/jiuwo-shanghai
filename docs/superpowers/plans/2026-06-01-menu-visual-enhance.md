# Menu 页面视觉与动效优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 Menu 页面的视觉呈现和动效，提升整体精致感。

**Architecture:** 修改三个现有组件（MenuPage、MenuNav、MenuSection），复用已有的 ScrollReveal 共享组件添加入场动画。保持文字为主、图片辅助的排版原则。

**Tech Stack:** Next.js 15, React 19, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/components/pages/MenuPage.tsx` | 修改 | 标题区域增加装饰线 |
| `components/MenuNav.tsx` | 修改 | 导航栏 pill 风格 + 下划线动画 + 渐变遮罩 |
| `components/MenuSection.tsx` | 修改 | 分类标题金色竖线 + 菜品卡片重构 + scroll-reveal |
| `components/ScrollReveal.tsx` | 无需修改 | 复用已有组件 |

---

### Task 1: MenuPage 标题区域装饰线

**Files:**
- Modify: `app/components/pages/MenuPage.tsx`

- [ ] **Step 1: 修改 `MenuPage.tsx` 标题区域**

当前代码：
```tsx
<div className="mx-auto max-w-7xl px-6">
  <h1 className="text-4xl font-semibold text-[#f5f5f0] tracking-wide mb-4">{title ?? 'Menu'}</h1>
  <p className="text-sm text-[#a0a0a0] mb-8 whitespace-pre-line">{subtitle ?? 'Click a category below to jump'}</p>
</div>
```

改为：
```tsx
<div className="mx-auto max-w-7xl px-6">
  <div className="flex items-center gap-6 mb-4">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#333] to-[#333]" />
    <h1 className="text-3xl md:text-4xl font-medium text-[#f5f5f0] tracking-wide shrink-0">
      {title ?? 'Menu'}
    </h1>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#333] to-[#333]" />
  </div>
  <p className="text-sm text-[#a0a0a0] mb-8 whitespace-pre-line text-center">
    {subtitle ?? 'Click a category below to jump'}
  </p>
</div>
```

- [ ] **Step 2: 验证编译**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add app/components/pages/MenuPage.tsx
git commit -m "feat: add decorative lines to menu page title"
```

---

### Task 2: MenuNav 导航栏精致化

**Files:**
- Modify: `components/MenuNav.tsx`

- [ ] **Step 1: 修改 `MenuNav.tsx` 导航栏样式**

当前代码：
```tsx
<nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
  <div className="mx-auto max-w-7xl px-6 flex gap-6 overflow-x-auto">
    {categories.map((cat) => (
      <a
        key={cat.category}
        href={`#${cat.category}`}
        className={`whitespace-nowrap text-sm transition-colors ${
          active === cat.category ? 'text-[#c9a227]' : 'text-[#a0a0a0] hover:text-[#c9a227]'
        }`}
      >
        {cat.category}
      </a>
    ))}
  </div>
</nav>
```

改为：
```tsx
<nav className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#222] py-4 mb-12">
  <div className="mx-auto max-w-7xl px-6">
    <div
      className="flex gap-6 overflow-x-auto"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      {categories.map((cat) => (
        <a
          key={cat.category}
          href={`#${cat.category}`}
          className="group relative whitespace-nowrap text-sm transition-colors py-1"
        >
          <span
            className={`transition-colors ${
              active === cat.category ? 'text-[#c9a227]' : 'text-[#a0a0a0] group-hover:text-[#c9a227]'
            }`}
          >
            {cat.category}
          </span>
          <span
            className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#c9a227] transition-transform duration-300 ease-out origin-center ${
              active === cat.category ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`}
          />
        </a>
      ))}
    </div>
  </div>
</nav>
```

- [ ] **Step 2: 验证编译**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add components/MenuNav.tsx
git commit -m "feat: polish menu nav with pill style and underline animation"
```

---

### Task 3: MenuSection 排版重构 + Scroll Reveal

**Files:**
- Modify: `components/MenuSection.tsx`

- [ ] **Step 1: 修改 `MenuSection.tsx` 引入 ScrollReveal**

顶部导入：
```tsx
import ScrollReveal from './ScrollReveal';
```

- [ ] **Step 2: 修改分类标题和菜品卡片**

当前代码：
```tsx
export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.category} className="mb-16 scroll-mt-32">
      <h2 className="text-2xl font-medium text-[#a0a0a0] mb-8 tracking-wide">{category.category}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {category.items.map((item) => (
          <div key={item.name} className="flex items-center gap-4 border-b border-[#222] pb-4">
            {item.image && (
              <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-[#141414]">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
              <p className="text-sm text-[#a0a0a0] mt-1">{item.description}</p>
            </div>
            <span className="text-base font-medium text-[#c9a227] whitespace-nowrap">CNY {item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

改为：
```tsx
export default function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <ScrollReveal>
      <section id={category.category} className="mb-16 scroll-mt-32">
        {/* Category title with gold accent line */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-6 bg-[#c9a227] rounded-full" />
          <h2 className="text-2xl font-medium text-[#a0a0a0] tracking-wide">{category.category}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {category.items.map((item, index) => (
            <ScrollReveal key={item.name} delay={index * 60}>
              <div className="flex items-start gap-4 pb-6 mb-6">
                {item.image && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#141414]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105 active:scale-[0.98]"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-medium text-[#f5f5f0]">{item.name}</h3>
                    <span className="text-sm font-medium text-[#c9a227] whitespace-nowrap">
                      CNY {item.price}
                    </span>
                  </div>
                  <p className="text-sm text-[#a0a0a0] mt-1.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
```

关键变更：
1. 分类标题左侧加金色竖线
2. 菜品卡片改为 `items-start`（顶部对齐），图片和文字都从顶部开始
3. 名称和价格同一行两端对齐
4. 描述在第二行
5. 图片圆角从 `rounded-md` 改为 `rounded-lg`
6. 去掉 `border-b`，改用 `pb-6 mb-6` 留白分隔
7. 图片增加 hover `scale(1.05)` 和 active `scale-[0.98]`
8. 价格字体从 `text-base` 改为 `text-sm`
9. 整个分类和每个菜品都用 `ScrollReveal` 包裹

- [ ] **Step 3: 验证编译**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add components/MenuSection.tsx
git commit -m "feat: refactor menu section layout with scroll-reveal and gold accents"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 标题区域装饰线 | Task 1 |
| 导航栏 pill 风格 | Task 2 |
| 导航栏下划线动画 | Task 2 |
| 导航栏渐变遮罩 | Task 2 |
| 分类标题金色竖线 | Task 3 |
| 菜品卡片名称价格两端对齐 | Task 3 |
| 菜品卡片去掉 border-b | Task 3 |
| 菜品卡片图片圆角 | Task 3 |
| 图片 hover/active 反馈 | Task 3 |
| 价格字体缩小 | Task 3 |
| ScrollReveal 入场动画 | Task 3 |

✅ 所有 spec 要求都有对应 task。

### 2. Placeholder Scan

- 无 "TBD", "TODO", "implement later"
- 无 "add appropriate error handling" 等模糊描述
- 每个代码步骤都有完整代码

✅ 通过。

### 3. Type Consistency

- `ScrollReveal` 组件 props 与已有定义一致（`children`, `delay`, `className`）
- `MenuCategory` 和 `MenuItem` 类型使用现有定义

✅ 通过。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-menu-visual-enhance.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
