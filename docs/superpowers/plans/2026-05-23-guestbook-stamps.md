# Guestbook with Stamps 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 JIUWO 网站新增留言本功能，访客可以留下一句话并选择一个动物印章，首页新增一个情感互动入口（hook section）。后端使用 Vercel Postgres + 邮件通知，前端采用 stamp ritual 交互设计。

**Architecture:** 数据库单表 `guestbook_entries`，API route 提供 POST（创建+防刷）和 DELETE（admin），共享页面组件 `GuestbookPage` 由 EN/ZH 路由分别传入 locale labels。首页 `GuestbookHook` 展示最新 3 条+总数，链接到独立 `/guestbook` 页面。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Vercel Postgres, Resend

**Verification:** 项目无单元测试框架，采用 `npx tsc --noEmit` + ESLint + 本地 dev server 在浏览器手工验证 EN/ZH 两版渲染、表单提交、动画效果。

---

## 文件结构映射

| 文件 | 职责 |
|------|------|
| `migrations/001_guestbook.sql` | DB schema（一次性手动执行） |
| `app/api/guestbook/route.ts` | POST 创建条目 + DELETE 删除条目（admin） |
| `lib/guestbook.ts` | DB 查询 helpers + 类型定义 + IP 哈希 |
| `lib/email.ts` | Resend 邮件通知封装 |
| `app/components/pages/GuestbookPage.tsx` | 留言本页面共享布局（client component，接收数据+labels） |
| `components/StampPanel.tsx` | 写留言面板（client，slide-up modal + stamp 动画） |
| `components/StampIcon.tsx` | 根据 stamp ID 渲染对应 SVG 图标 |
| `components/stamps/Monkey.tsx` 等 5 个 | 动物印章内联 SVG 组件 |
| `components/GuestbookHook.tsx` | 首页 hook section（server component） |
| `app/(en)/guestbook/page.tsx` | 英文留言本路由 |
| `app/zh/guestbook/page.tsx` | 中文留言本路由 |
| `app/admin/guestbook/page.tsx` | 管理页面（key-gated，可删除条目） |
| `app/components/pages/HomePage.tsx` | 接入 `GuestbookHook` |
| `app/(en)/page.tsx` | 英文首页：fetch hook 数据 |
| `app/zh/page.tsx` | 中文首页：fetch hook 数据 |
| `package.json` | 新增 `@vercel/postgres`, `resend` |

---

### Task 1: 安装依赖

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: 安装 @vercel/postgres 和 resend**

```bash
cd "/Users/aidanliu/Documents/JIUWO Shanghai" && npm install @vercel/postgres resend
```

Expected: `package.json` 的 `dependencies` 中新增 `"@vercel/postgres"` 和 `"resend"` 条目，`package-lock.json` 更新。

- [ ] **Step 2: 在 `.env.local` 中添加占位变量（本地开发用）**

在 `.env.local` 末尾追加（文件不存在则创建）：

```bash
# Guestbook
POSTGRES_URL="postgresql://localhost:5432/jiuwo"
RESEND_API_KEY=""
GUESTBOOK_ADMIN_KEY="local-dev-key"
IP_HASH_SALT="local-dev-salt-change-in-production"
```

说明：
- `RESEND_API_KEY` 留空，本地开发时邮件发送静默跳过（见 `lib/email.ts` lazy check）
- `POSTGRES_URL` 本地开发时需替换为实际 Vercel Postgres 连接串（通过 `vercel env pull` 或手动复制）
- `GUESTBOOK_ADMIN_KEY` 和 `IP_HASH_SALT` 本地任意值即可

- [ ] **Step 3: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出，无错误。

- [ ] **Step 4: 提交**

```bash
git add package.json package-lock.json .env.local
git commit -m "deps: add @vercel/postgres and resend for guestbook"
```

---

### Task 2: 数据库迁移

**Files:**
- Create: `migrations/001_guestbook.sql`

- [ ] **Step 1: 创建 migration 文件**

创建 `migrations/001_guestbook.sql`：

```sql
CREATE TABLE IF NOT EXISTS guestbook_entries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30)  NOT NULL,
  message     VARCHAR(140) NOT NULL,
  stamp       VARCHAR(10)  NOT NULL CHECK (stamp IN ('monkey', 'pig', 'wolf', 'dog', 'bear')),
  email       VARCHAR(120),
  ip_hash     VARCHAR(64)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_ip_recent ON guestbook_entries (ip_hash, created_at DESC);
```

- [ ] **Step 2: 在 Vercel Postgres dashboard 中执行 migration**

登录 Vercel Dashboard → Storage → 选择 JIUWO Postgres → Query 标签页，粘贴上述 SQL 执行。

Expected: 两条 `CREATE INDEX` 命令成功返回，无报错。

- [ ] **Step 3: 提交 migration 文件（作为记录，不自动执行）**

```bash
git add migrations/001_guestbook.sql
git commit -m "db: add guestbook_entries schema migration"
```

---

### Task 3: 创建 Stamp SVG 组件

**Files:**
- Create: `components/stamps/Monkey.tsx`
- Create: `components/stamps/Pig.tsx`
- Create: `components/stamps/Wolf.tsx`
- Create: `components/stamps/Dog.tsx`
- Create: `components/stamps/Bear.tsx`

项目无 SVGR 配置，因此每个 stamp 以内联 React 组件方式实现，通过 `currentColor` 控制颜色。

- [ ] **Step 1: 创建 stamps 目录**

```bash
mkdir -p components/stamps
```

- [ ] **Step 2: 创建 5 个 stamp 组件文件**

每个组件接收标准 SVG props，通过 `...props` 透传。

**components/stamps/Monkey.tsx：**
```tsx
export default function Monkey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="18" cy="16" rx="5" ry="6" />
      <ellipse cx="30" cy="16" rx="5" ry="6" />
      <path d="M16 14c0-2 2-3 4-3s4 1 4 3M12 20c-3 4-2 10 2 14 3 3 8 4 12 4s9-1 12-4c4-4 5-10 2-14" />
      <path d="M22 28c0 2 1.5 3 3 3s3-1 3-3" />
    </svg>
  );
}
```

**components/stamps/Pig.tsx：**
```tsx
export default function Pig(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="24" cy="26" rx="12" ry="10" />
      <ellipse cx="18" cy="22" rx="3" ry="2.5" />
      <ellipse cx="30" cy="22" rx="3" ry="2.5" />
      <circle cx="17.5" cy="21.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="29.5" cy="21.5" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="30" rx="4" ry="3" />
      <path d="M15 18c-4-1-6 2-5 5M33 18c4-1 6 2 5 5" />
      <path d="M20 36c0 2 1.8 3 4 3s4-1 4-3" />
    </svg>
  );
}
```

**components/stamps/Wolf.tsx：**
```tsx
export default function Wolf(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <path d="M14 28c-2-2-3-6-1-9l3-8 4 4 4-2 4 2 4-4 3 8c2 3 1 7-1 9" />
      <ellipse cx="20" cy="24" rx="2" ry="2.5" />
      <ellipse cx="28" cy="24" rx="2" ry="2.5" />
      <circle cx="19.5" cy="23.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="27.5" cy="23.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M22 30l2 3 2-3" />
    </svg>
  );
}
```

**components/stamps/Dog.tsx：**
```tsx
export default function Dog(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="24" cy="26" rx="10" ry="9" />
      <ellipse cx="17" cy="20" rx="4" ry="5" />
      <ellipse cx="31" cy="20" rx="4" ry="5" />
      <circle cx="16.5" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="30.5" cy="19" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="30" rx="3.5" ry="2.5" />
      <path d="M19 14c-1-3-3-4-5-3M29 14c1-3 3-4 5-3" />
    </svg>
  );
}
```

**components/stamps/Bear.tsx：**
```tsx
export default function Bear(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="24" cy="24" r="22" />
      <circle cx="14" cy="14" r="5" />
      <circle cx="34" cy="14" r="5" />
      <ellipse cx="24" cy="27" rx="11" ry="10" />
      <ellipse cx="19" cy="25" rx="2.5" ry="3" />
      <ellipse cx="29" cy="25" rx="2.5" ry="3" />
      <circle cx="18.5" cy="24.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="28.5" cy="24.5" r="0.8" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="31" rx="4" ry="3" />
      <path d="M21 34c0 2 1.5 3 3 3s3-1 3-3" />
    </svg>
  );
}
```

说明：以上 SVG 为占位艺术风格（几何线描），后续可根据实际需要替换为手绘风格版本，组件接口不变。

- [ ] **Step 3: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 4: 提交**

```bash
git add components/stamps/
git commit -m "assets: add 5 animal stamp SVG components"
```

---

### Task 4: 创建 lib/guestbook.ts

**Files:**
- Create: `lib/guestbook.ts`

- [ ] **Step 1: 创建 DB helpers 文件**

创建 `lib/guestbook.ts`：

```typescript
import { sql } from '@vercel/postgres';

export const ALLOWED_STAMPS = ['monkey', 'pig', 'wolf', 'dog', 'bear'] as const;
export type StampId = (typeof ALLOWED_STAMPS)[number];

export interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  stamp: StampId;
  created_at: string;
}

export interface GuestbookEntryRaw extends GuestbookEntry {
  email: string | null;
  ip_hash: string;
}

export interface GuestbookLabels {
  title: string;
  subtitle: string;
  cta: string;
  countPrefix: string;
  countSuffix: string;
  nameLabel: string;
  messageLabel: string;
  emailLabel: string;
  emailHint: string;
  stampSelectLabel: string;
  submitButton: string;
  rateLimitMessage: string;
  closeButton: string;
  emptyState: string;
}

export interface GuestbookHookLabels {
  countText: string;
  cta: string;
}

// Lazy env checks — don't break the build if vars are missing in dev
function getEnv(name: string): string | undefined {
  try {
    return process.env[name];
  } catch {
    return undefined;
  }
}

export async function hashIp(ip: string): Promise<string> {
  const salt = getEnv('IP_HASH_SALT') || 'default-salt';
  const data = new TextEncoder().encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createEntry({
  name,
  message,
  stamp,
  email,
  ipHash,
}: {
  name: string;
  message: string;
  stamp: StampId;
  email?: string;
  ipHash: string;
}): Promise<GuestbookEntry> {
  const result = await sql<GuestbookEntryRaw>`
    INSERT INTO guestbook_entries (name, message, stamp, email, ip_hash)
    VALUES (${name}, ${message}, ${stamp}, ${email || null}, ${ipHash})
    RETURNING id, name, message, stamp, created_at
  `;
  return result.rows[0];
}

export async function listEntries(limit?: number): Promise<GuestbookEntry[]> {
  const query = limit
    ? sql<GuestbookEntry>`
        SELECT id, name, message, stamp, created_at
        FROM guestbook_entries
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : sql<GuestbookEntry>`
        SELECT id, name, message, stamp, created_at
        FROM guestbook_entries
        ORDER BY created_at DESC
      `;
  const result = await query;
  return result.rows;
}

export async function countEntries(): Promise<number> {
  const result = await sql<{ count: number }>`SELECT COUNT(*) as count FROM guestbook_entries`;
  return Number(result.rows[0].count);
}

export async function recentCountForIp(ipHash: string, minutes: number = 60): Promise<number> {
  const result = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM guestbook_entries
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - INTERVAL '${minutes} minutes'
  `;
  return Number(result.rows[0].count);
}

export async function deleteEntry(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM guestbook_entries WHERE id = ${id}`;
  return result.rowCount ? result.rowCount > 0 : false;
}

export async function getEntryById(id: number): Promise<GuestbookEntryRaw | null> {
  const result = await sql<GuestbookEntryRaw>`
    SELECT * FROM guestbook_entries WHERE id = ${id}
  `;
  return result.rows[0] || null;
}
```

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add lib/guestbook.ts
git commit -m "lib: add guestbook DB helpers and types"
```

---

### Task 5: 创建 lib/email.ts

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: 创建邮件通知封装**

创建 `lib/email.ts`：

```typescript
import { Resend } from 'resend';
import type { GuestbookEntryRaw } from './guestbook';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return null;
  }
  return new Resend(apiKey);
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function stampEmoji(stamp: string): string {
  const map: Record<string, string> = {
    monkey: '🐵',
    pig: '🐷',
    wolf: '🐺',
    dog: '🐶',
    bear: '🐻',
  };
  return map[stamp] || '✦';
}

export async function sendGuestbookNotification(entry: GuestbookEntryRaw): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.log('[guestbook] Email skipped: RESEND_API_KEY not set');
    return;
  }

  const adminKey = process.env.GUESTBOOK_ADMIN_KEY || '';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3001';

  const relativeTime = formatRelativeTime(entry.created_at);
  const ipShort = entry.ip_hash.slice(-8);
  const adminLink = `${baseUrl}/admin/guestbook?id=${entry.id}&key=${adminKey}`;

  const subject = `New stamp in guestbook — ${entry.name}`;

  const plainText = `
New guestbook entry

Name: ${entry.name}
Message: ${entry.message}
Stamp: ${stampEmoji(entry.stamp)} ${entry.stamp}
Time: ${relativeTime}
IP hash (last 8): ${ipShort}

Admin: ${adminLink}
`.trim();

  const html = `
<div style="font-family: system-ui, sans-serif; max-width: 480px; color: #0a0a0a;">
  <h2 style="color: #c9a227; font-weight: 500;">New stamp in guestbook</h2>
  <p style="font-size: 18px; margin: 16px 0; color: #0a0a0a;"><strong>${entry.name}</strong></p>
  <p style="font-size: 16px; font-style: italic; color: #333; border-left: 2px solid #c9a227; padding-left: 12px;">${entry.message}</p>
  <p style="margin-top: 12px; color: #666;">Stamp: ${stampEmoji(entry.stamp)} ${entry.stamp} · ${relativeTime}</p>
  <p style="margin-top: 8px; font-size: 12px; color: #999;">IP hash: …${ipShort}</p>
  <p style="margin-top: 20px;">
    <a href="${adminLink}" style="color: #c9a227; text-decoration: underline;">View in admin →</a>
  </p>
</div>
`.trim();

  try {
    await resend.emails.send({
      from: 'JIUWO <noreply@jiuwoshanghai.net>',
      to: 'aidan@jiuwoshanghai.net',
      subject,
      text: plainText,
      html,
    });
  } catch (err) {
    console.error('[guestbook] Resend error:', err);
    // fire-and-forget: don't throw, entry already saved
  }
}
```

说明：
- `getResendClient()` 做 lazy check，本地无 `RESEND_API_KEY` 时静默跳过
- `VERCEL_URL` 由 Vercel 自动注入；本地 fallback 到 `localhost:3001`
- 邮件发送失败不抛异常，不影响用户流程

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add lib/email.ts
git commit -m "lib: add Resend email notification for guestbook entries"
```

---

### Task 6: 创建 API Route

**Files:**
- Create: `app/api/guestbook/route.ts`

- [ ] **Step 1: 创建 POST + DELETE handlers**

创建 `app/api/guestbook/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  ALLOWED_STAMPS,
  hashIp,
  createEntry,
  recentCountForIp,
  deleteEntry,
  getEntryById,
  type StampId,
} from '@/lib/guestbook';
import { sendGuestbookNotification } from '@/lib/email';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function validateEmail(email: string): boolean {
  if (!email || email.trim().length === 0) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST — Create a new entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, stamp, email, website } = body;

    // Honeypot check
    if (website && typeof website === 'string' && website.length > 0) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 30) {
      return NextResponse.json({ error: 'Name must be 1-30 characters' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.trim().length > 140) {
      return NextResponse.json({ error: 'Message must be 1-140 characters' }, { status: 400 });
    }
    if (!stamp || !ALLOWED_STAMPS.includes(stamp)) {
      return NextResponse.json({ error: 'Invalid stamp' }, { status: 400 });
    }
    if (email && !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // IP rate limit
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const recentCount = await recentCountForIp(ipHash, 60);
    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "You've left a few stamps already — try again in a bit." },
        { status: 429 }
      );
    }

    // Insert
    const entry = await createEntry({
      name: name.trim(),
      message: message.trim(),
      stamp: stamp as StampId,
      email: email?.trim(),
      ipHash,
    });

    // Fire-and-forget email
    const fullEntry = await getEntryById(entry.id);
    if (fullEntry) {
      sendGuestbookNotification(fullEntry).catch(() => {});
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error('Guestbook POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — Admin only
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const key = searchParams.get('key');

    if (!id || !key) {
      return NextResponse.json({ error: 'Missing id or key' }, { status: 400 });
    }

    const adminKey = process.env.GUESTBOOK_ADMIN_KEY;
    if (!adminKey || key !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await deleteEntry(Number(id));
    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Guestbook DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add app/api/guestbook/route.ts
git commit -m "api: add guestbook POST (create+rate-limit) and DELETE (admin) endpoints"
```

---

### Task 7: 创建 StampIcon 组件

**Files:**
- Create: `components/StampIcon.tsx`

- [ ] **Step 1: 创建 stamp 渲染组件**

创建 `components/StampIcon.tsx`：

```tsx
import { ALLOWED_STAMPS, type StampId } from '@/lib/guestbook';
import Monkey from './stamps/Monkey';
import Pig from './stamps/Pig';
import Wolf from './stamps/Wolf';
import Dog from './stamps/Dog';
import Bear from './stamps/Bear';

const STAMP_LABELS: Record<StampId, { en: string; zh: string }> = {
  monkey: { en: 'Monkey', zh: '猴' },
  pig: { en: 'Pig', zh: '猪' },
  wolf: { en: 'Wolf', zh: '狼' },
  dog: { en: 'Dog', zh: '狗' },
  bear: { en: 'Bear', zh: '熊' },
};

const StampComponents: Record<StampId, React.FC<React.SVGProps<SVGSVGElement>>> = {
  monkey: Monkey,
  pig: Pig,
  wolf: Wolf,
  dog: Dog,
  bear: Bear,
};

export function StampIcon({
  stamp,
  className = '',
  size = 48,
  'aria-label': ariaLabel,
}: {
  stamp: StampId;
  className?: string;
  size?: number;
  'aria-label'?: string;
}) {
  const Component = StampComponents[stamp];
  const label = ariaLabel || STAMP_LABELS[stamp].en;
  return (
    <Component
      className={className}
      width={size}
      height={size}
      aria-label={label}
      role="img"
    />
  );
}

export function getStampLabel(stamp: StampId, locale: 'en' | 'zh' = 'en'): string {
  return STAMP_LABELS[stamp][locale];
}

export { ALLOWED_STAMPS, type StampId };
```

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add components/StampIcon.tsx
git commit -m "components: add StampIcon with 5 animal stamps and bilingual labels"
```

---

### Task 8: 创建 GuestbookPage 共享组件

**Files:**
- Create: `app/components/pages/GuestbookPage.tsx`

- [ ] **Step 1: 创建 labels 类型和相对时间格式化辅助函数**

先定义 `GuestbookLabels` 接口和相对时间格式化函数。

```tsx
'use client';

import { useState, useCallback } from 'react';
import { StampIcon } from '@/components/StampIcon';
import { StampPanel } from '@/components/StampPanel';
import type { GuestbookEntry, StampId, GuestbookLabels } from '@/lib/guestbook';

function formatRelativeTime(dateStr: string, locale: 'en' | 'zh'): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'zh') {
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    return `${diffDays} 天前`;
  }

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
```

- [ ] **Step 2: 继续创建 GuestbookPage 主组件**

在同一个文件中继续添加主组件（Step 1 和 Step 2 是同一个文件的不同段落，为了可读性拆分）：

```tsx
export default function GuestbookPage({
  entries: initialEntries,
  totalCount,
  labels,
  locale,
}: {
  entries: GuestbookEntry[];
  totalCount: number;
  labels: GuestbookLabels;
  locale: 'en' | 'zh';
}) {
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [animatingEntryId, setAnimatingEntryId] = useState<number | null>(null);

  const handleNewEntry = useCallback((entry: GuestbookEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setAnimatingEntryId(entry.id);
    setTimeout(() => setAnimatingEntryId(null), 1000);
  }, []);
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [animatingEntryId, setAnimatingEntryId] = useState<number | null>(null);

  const handleNewEntry = useCallback((entry: GuestbookEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setAnimatingEntryId(entry.id);
    setTimeout(() => setAnimatingEntryId(null), 1000);
  }, []);

  return (
    <main className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="px-6 pt-20 pb-8 md:pt-28 md:pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl md:text-6xl font-medium tracking-widest text-[#f5f5f0]">
            {labels.title}
          </h1>
          <p className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-[#c9a227]">
            {labels.subtitle}
          </p>
        </div>
      </section>

      {/* CTA + Count */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-6">
          <button
            onClick={() => setIsPanelOpen(true)}
            className="px-8 py-3 border border-[#c9a227] text-[#c9a227] text-sm uppercase tracking-[0.2em] hover:bg-[#c9a227] hover:text-[#0a0a0a] transition-colors duration-300"
          >
            {labels.cta}
          </button>
          <p className="text-sm tracking-wider text-[#a0a0a0]">
            —— {labels.countPrefix}{totalCount}{labels.countSuffix} ——
          </p>
        </div>
      </section>

      {/* Entries list */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl">
          {entries.length === 0 ? (
            <p className="text-center text-[#a0a0a0] py-16">{labels.emptyState}</p>
          ) : (
            <div className="space-y-0">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className={`py-6 border-b border-[#c9a22733] transition-all duration-700 ${
                    animatingEntryId === entry.id
                      ? 'opacity-0 -translate-y-4 animate-[fadeInDown_0.7s_ease-out_forwards]'
                      : ''
                  }`}
                >
                  <p className="text-lg md:text-xl text-[#f5f5f0] leading-relaxed">
                    &ldquo;{entry.message}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-[#c9a227] tracking-wider">
                      — {entry.name} · {formatRelativeTime(entry.created_at, locale)}
                    </p>
                    <StampIcon
                      stamp={entry.stamp as StampId}
                      size={28}
                      className="text-[#c9a227]"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stamp Panel */}
      <StampPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSuccess={handleNewEntry}
        labels={labels}
        locale={locale}
      />
    </main>
  );
}
```

说明：
- `GuestbookPage` 是 client component（`'use client'`），因为它管理本地状态（entries 列表、panel 开关、动画状态）
- Server component（路由页面）负责 fetch 数据，通过 props 传入
- `animate-[fadeInDown_0.7s_ease-out_forwards]` 需要 `globals.css` 中预定义 `@keyframes fadeInDown`，见 Step 3

- [ ] **Step 3: 在 `globals.css` 中添加 `fadeInDown` keyframes**

在 `app/globals.css` 末尾追加：

```css
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

说明：Tailwind CSS 4 的 `animate-[fadeInDown_0.7s_ease-out_forwards]` 需要预定义 keyframes。

- [ ] **Step 4: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 5: 提交**

```bash
git add app/components/pages/GuestbookPage.tsx app/globals.css
git commit -m "components: add GuestbookPage shared layout with entries list and CTA"
```

---

### Task 9: 创建 StampPanel 客户端组件

**Files:**
- Create: `components/StampPanel.tsx`

- [ ] **Step 1: 创建写留言面板**

创建 `components/StampPanel.tsx`：

```tsx
'use client';

import { useState, useCallback } from 'react';
import { StampIcon, getStampLabel } from './StampIcon';
import { ALLOWED_STAMPS, type StampId, type GuestbookEntry, type GuestbookLabels } from '@/lib/guestbook';

export function StampPanel({
  isOpen,
  onClose,
  onSuccess,
  labels,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: GuestbookEntry) => void;
  labels: GuestbookLabels;
  locale: 'en' | 'zh';
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [selectedStamp, setSelectedStamp] = useState<StampId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDropAnimation, setShowDropAnimation] = useState(false);

  const isFormValid =
    name.trim().length > 0 &&
    name.trim().length <= 30 &&
    message.trim().length > 0 &&
    message.trim().length <= 140 &&
    selectedStamp !== null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid || isSubmitting) return;

      setIsSubmitting(true);
      setError('');

      try {
        const res = await fetch('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            message: message.trim(),
            stamp: selectedStamp,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
          }),
        });

        if (res.status === 429) {
          setError(labels.rateLimitMessage);
          setIsSubmitting(false);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Something went wrong');
          setIsSubmitting(false);
          return;
        }

        const entry: GuestbookEntry = await res.json();

        // Trigger drop animation
        setShowDropAnimation(true);
        setTimeout(() => {
          setShowDropAnimation(false);
          onSuccess(entry);
          onClose();
          // Reset form
          setName('');
          setMessage('');
          setEmail('');
          setSelectedStamp(null);
        }, 1200);
      } catch (err) {
        setError('Network error. Please try again.');
        setIsSubmitting(false);
      }
    },
    [isFormValid, isSubmitting, name, message, selectedStamp, email, website, labels, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#c9a22733] max-h-[90vh] overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="text-[#a0a0a0] hover:text-[#f5f5f0] text-sm tracking-wider"
            >
              {labels.closeButton} ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.nameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.messageLabel}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={140}
                rows={3}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors resize-none"
                required
              />
              <p className="text-right text-xs text-[#666] mt-1">{message.length}/140</p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-2">
                {labels.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#c9a22733] text-[#f5f5f0] py-2 focus:outline-none focus:border-[#c9a227] transition-colors"
              />
              <p className="text-xs text-[#666] mt-1">{labels.emailHint}</p>
            </div>

            {/* Honeypot — hidden */}
            <div style={{ display: 'none' }}>
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Stamp selection */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#a0a0a0] mb-4">
                {labels.stampSelectLabel}
              </label>
              <div className="flex gap-4 justify-center">
                {ALLOWED_STAMPS.map((stamp) => (
                  <button
                    key={stamp}
                    type="button"
                    onClick={() => setSelectedStamp(stamp)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      selectedStamp === stamp
                        ? 'scale-110 ring-2 ring-[#c9a227] ring-offset-2 ring-offset-[#0a0a0a]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-label={getStampLabel(stamp, locale)}
                  >
                    <StampIcon
                      stamp={stamp}
                      size={40}
                      className={selectedStamp === stamp ? 'text-[#c9a227]' : 'text-[#a0a0a0]'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-3 bg-[#c9a227] text-[#0a0a0a] text-sm uppercase tracking-[0.2em] font-medium hover:bg-[#d4b43a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '...' : labels.submitButton}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Drop animation overlay */}
      {showDropAnimation && selectedStamp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-[stampDrop_1.2s_ease-out_forwards]">
            <StampIcon
              stamp={selectedStamp}
              size={120}
              className="text-[#c9a227]"
            />
          </div>
          <div className="absolute inset-0 animate-[inkHalo_1.2s_ease-out_forwards]" />
        </div>
      )}

      <style jsx>{`
        @keyframes stampDrop {
          0% { transform: translateY(-200px) scale(0.5); opacity: 0; }
          40% { transform: translateY(10px) scale(1.1); opacity: 1; }
          50% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0.8; }
        }
        @keyframes inkHalo {
          0% { background: radial-gradient(circle at center, rgba(201,162,39,0) 0%, rgba(201,162,39,0) 100%); }
          50% { background: radial-gradient(circle at center, rgba(201,162,39,0.15) 0%, rgba(201,162,39,0) 70%); }
          100% { background: radial-gradient(circle at center, rgba(201,162,39,0) 0%, rgba(201,162,39,0) 100%); }
        }
      `}</style>
    </>
  );
}
```

说明：
- 面板从底部滑出（`fixed bottom-0`），带半透明 backdrop
- Honeypot 字段 `website` 使用 `display:none`，真实用户不会填
- Stamp 选择使用圆形按钮，选中时有 scale + ring 效果
- Submit 按钮仅在 name、message、stamp 都有效时启用
- 提交成功时显示 stamp drop 动画（stamp 从上方落下 + ink halo 扩散），然后关闭面板并通知父组件添加新条目
- `labels` 从父组件传入，确保双语一致

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add components/StampPanel.tsx
git commit -m "components: add StampPanel client component with form, stamp selection, and drop animation"
```

---

### Task 10: 创建 guestbook 路由页面

**Files:**
- Create: `app/(en)/guestbook/page.tsx`
- Create: `app/zh/guestbook/page.tsx`

- [ ] **Step 1: 创建英文路由页面**

创建 `app/(en)/guestbook/page.tsx`：

```tsx
import GuestbookPage from '@/app/components/pages/GuestbookPage';
import { listEntries, countEntries, type GuestbookLabels } from '@/lib/guestbook';

export const dynamic = 'force-dynamic';

const labels: GuestbookLabels = {
  title: 'GUESTBOOK',
  subtitle: 'Leave a mark on the wall',
  cta: 'Leave a stamp',
  countPrefix: '',
  countSuffix: ' stamps',
  nameLabel: 'Your name',
  messageLabel: 'Your message',
  emailLabel: 'Email (optional)',
  emailHint: 'Never displayed publicly',
  stampSelectLabel: 'Choose your stamp',
  submitButton: 'Pour ink',
  rateLimitMessage: "You've left a few stamps already — try again in a bit.",
  closeButton: 'Close',
  emptyState: 'No stamps yet. Be the first!',
};

export default async function Page() {
  const [entries, totalCount] = await Promise.all([
    listEntries(),
    countEntries(),
  ]);

  return (
    <GuestbookPage
      entries={entries}
      totalCount={totalCount}
      labels={labels}
      locale="en"
    />
  );
}
```

- [ ] **Step 2: 创建中文路由页面**

创建 `app/zh/guestbook/page.tsx`：

```tsx
import GuestbookPage from '@/app/components/pages/GuestbookPage';
import { listEntries, countEntries, type GuestbookLabels } from '@/lib/guestbook';

export const dynamic = 'force-dynamic';

const labels: GuestbookLabels = {
  title: '客言',
  subtitle: '在墙上留下你的痕迹',
  cta: '留下印章',
  countPrefix: '',
  countSuffix: ' 枚印章',
  nameLabel: '你的名字',
  messageLabel: '你想说的话',
  emailLabel: '邮箱（可选）',
  emailHint: '不会公开显示',
  stampSelectLabel: '选择你的印章',
  submitButton: '盖章',
  rateLimitMessage: '已经留下好几个章了，稍后再来吧。',
  closeButton: '关闭',
  emptyState: '还没有印章，来做第一个吧！',
};

export default async function Page() {
  const [entries, totalCount] = await Promise.all([
    listEntries(),
    countEntries(),
  ]);

  return (
    <GuestbookPage
      entries={entries}
      totalCount={totalCount}
      labels={labels}
      locale="zh"
    />
  );
}
```

说明：
- 两个路由页面都是 server component，使用 `force-dynamic`（不缓存，每次请求都查 DB）
- EN/ZH 显示同一份全球条目流，仅 UI chrome 不同
- `GuestbookLabels` 通过 import type 引用，值在路由页面中定义

- [ ] **Step 3: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 4: dev server 验证两个路由都能 200**

Run（dev server 需已启动）：
```bash
curl -s -o /dev/null -w "EN %{http_code}\n" http://localhost:3001/guestbook
curl -s -o /dev/null -w "ZH %{http_code}\n" http://localhost:3001/zh/guestbook
```
Expected:
```
EN 200
ZH 200
```

- [ ] **Step 5: 提交**

```bash
git add app/(en)/guestbook/ app/zh/guestbook/
git commit -m "pages: add /guestbook and /zh/guestbook routes with locale labels"
```

---

### Task 11: 创建 GuestbookHook 首页组件

**Files:**
- Create: `components/GuestbookHook.tsx`

- [ ] **Step 1: 创建首页 hook section**

创建 `components/GuestbookHook.tsx`：

```tsx
import Link from 'next/link';
import { StampIcon } from './StampIcon';
import type { GuestbookEntry, StampId, GuestbookHookLabels } from '@/lib/guestbook';

export default function GuestbookHook({
  entries,
  totalCount,
  labels,
  href,
}: {
  entries: GuestbookEntry[];
  totalCount: number;
  labels: GuestbookHookLabels;
  href: string;
}) {
  return (
    <section className="bg-[#0a0a0a] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        {/* Count */}
        <p className="text-center text-sm tracking-wider text-[#a0a0a0] mb-10">
          —— {totalCount} {labels.countText} ——
        </p>

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="space-y-6 mb-10">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4"
              >
                <p className="text-base md:text-lg text-[#f5f5f0] leading-relaxed italic">
                  &ldquo;{entry.message}&rdquo;
                </p>
                <StampIcon
                  stamp={entry.stamp as StampId}
                  size={24}
                  className="text-[#c9a227] flex-shrink-0 mt-1"
                />
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <Link
            href={href}
            className="inline-block text-sm text-[#c9a227] tracking-wider hover:underline"
          >
            {labels.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
```

说明：
- `GuestbookHook` 是 server component（无 `'use client'`）
- 显示最新 3 条留言 + 总数量 + CTA 链接
- 样式与 AboutPage 的 `max-w-2xl` 列宽保持一致

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: 提交**

```bash
git add components/GuestbookHook.tsx
git commit -m "components: add GuestbookHook for homepage section"
```

---

### Task 12: 集成 GuestbookHook 到首页

**Files:**
- Modify: `app/components/pages/HomePage.tsx`
- Modify: `app/(en)/page.tsx`
- Modify: `app/zh/page.tsx`

- [ ] **Step 1: 修改 HomePage 组件接收 guestbook 数据**

修改 `app/components/pages/HomePage.tsx`：

现有代码：
```tsx
import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} intro={site.intro} />
      <JournalStream entries={entries} title={journalTitle} />
    </>
  );
}
```

改为：
```tsx
import HeroCarousel from '@/components/HeroCarousel';
import JournalStream from '@/components/JournalStream';
import GuestbookHook from '@/components/GuestbookHook';
import type { HeroSlide, JournalEntry, SiteData } from '@/lib/data';
import type { GuestbookEntry, GuestbookHookLabels } from '@/lib/guestbook';

export default function HomePage({
  site,
  slides,
  entries,
  journalTitle,
  guestbookEntries,
  guestbookTotal,
  guestbookLabels,
  guestbookHref,
}: {
  site: SiteData;
  slides: HeroSlide[];
  entries: JournalEntry[];
  journalTitle?: string;
  guestbookEntries: GuestbookEntry[];
  guestbookTotal: number;
  guestbookLabels: GuestbookHookLabels;
  guestbookHref: string;
}) {
  return (
    <>
      <HeroCarousel slides={slides} title={site.name} tagline={site.tagline} intro={site.intro} />
      <JournalStream entries={entries} title={journalTitle} />
      <GuestbookHook
        entries={guestbookEntries}
        totalCount={guestbookTotal}
        labels={guestbookLabels}
        href={guestbookHref}
      />
    </>
  );
}
```

- [ ] **Step 2: 修改英文首页路由 fetch guestbook 数据**

修改 `app/(en)/page.tsx`：

现有代码：
```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="Updates" />;
}
```

改为：
```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteData } from '@/lib/data';
import { listEntries, countEntries, type GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

const guestbookLabels: GuestbookHookLabels = {
  countText: 'stamps so far',
  cta: 'Leave your own',
};

export default async function Page() {
  const [site, slides, entries, guestbookEntries, guestbookTotal] = await Promise.all([
    getSiteData(),
    getHeroSlides(),
    getJournalEntries(),
    listEntries(3),
    countEntries(),
  ]);

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="Updates"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/guestbook"
    />
  );
}
```

- [ ] **Step 3: 修改中文首页路由 fetch guestbook 数据**

修改 `app/zh/page.tsx`：

现有代码：
```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntries, getSiteDataZh } from '@/lib/data';

export default async function Page() {
  const [site, slides, entries] = await Promise.all([
    getSiteDataZh(),
    getHeroSlides(),
    getJournalEntriesZh(),
  ]);

  return <HomePage site={site} slides={slides} entries={entries} journalTitle="最新动态" />;
}
```

改为：
```tsx
import HomePage from '@/app/components/pages/HomePage';
import { getHeroSlides, getJournalEntriesZh, getSiteDataZh } from '@/lib/data';
import { listEntries, countEntries, type GuestbookHookLabels } from '@/lib/guestbook';

export const revalidate = 60;

const guestbookLabels: GuestbookHookLabels = {
  countText: '枚印章',
  cta: '留下你的',
};

export default async function Page() {
  const [site, slides, entries, guestbookEntries, guestbookTotal] = await Promise.all([
    getSiteDataZh(),
    getHeroSlides(),
    getJournalEntriesZh(),
    listEntries(3),
    countEntries(),
  ]);

  return (
    <HomePage
      site={site}
      slides={slides}
      entries={entries}
      journalTitle="最新动态"
      guestbookEntries={guestbookEntries}
      guestbookTotal={guestbookTotal}
      guestbookLabels={guestbookLabels}
      guestbookHref="/zh/guestbook"
    />
  );
}
```

说明：
- 首页路由使用 `revalidate = 60`（1 分钟 ISR），避免每次首页访问都查 DB
- `listEntries(3)` 取最新 3 条，`countEntries()` 取总数
- 所有数据 fetch 并行执行（`Promise.all`）

- [ ] **Step 4: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 5: dev server 验证首页正常**

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

同时检查首页 HTML 中包含 `GuestbookHook` 的相关文本（如 "stamps so far" 或 "枚印章"）。

- [ ] **Step 6: 提交**

```bash
git add app/components/pages/HomePage.tsx app/(en)/page.tsx app/zh/page.tsx
git commit -m "feat: integrate GuestbookHook into homepage with EN/ZH labels"
```

---

### Task 13: 创建 Admin 页面

**Files:**
- Create: `app/admin/guestbook/page.tsx`

- [ ] **Step 1: 创建管理页面**

创建 `app/admin/guestbook/page.tsx`：

```tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listEntries, deleteEntry } from '@/lib/guestbook';
import { StampIcon } from '@/components/StampIcon';
import type { StampId } from '@/lib/guestbook';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ key?: string; id?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { key, id } = await searchParams;
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY;

  if (!adminKey || key !== adminKey) {
    redirect('/');
  }

  const entries = await listEntries();

  // Handle delete action (server action via form)
  async function handleDelete(formData: FormData) {
    'use server';
    const entryId = formData.get('entryId');
    const adminKeyFromForm = formData.get('adminKey');
    if (entryId && adminKeyFromForm === process.env.GUESTBOOK_ADMIN_KEY) {
      await deleteEntry(Number(entryId));
    }
  }

  return (
    <main className="bg-[#0a0a0a] min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl text-[#f5f5f0] mb-8">Guestbook Admin</h1>

        {id && (
          <div className="mb-6 p-4 border border-[#c9a227] text-[#c9a227] text-sm">
            Viewing entry #{id}
          </div>
        )}

        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 border border-[#c9a22733] ${
                id && Number(id) === entry.id ? 'border-[#c9a227]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[#f5f5f0]">&ldquo;{entry.message}&rdquo;</p>
                  <p className="text-sm text-[#c9a227] mt-2">
                    — {entry.name} · {entry.stamp} · {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <StampIcon stamp={entry.stamp as StampId} size={24} className="text-[#c9a227]" />
              </div>
              <form action={handleDelete} className="mt-3">
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="adminKey" value={key} />
                <button
                  type="submit"
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <p className="text-[#a0a0a0]">No entries yet.</p>
        )}
      </div>
    </main>
  );
}
```

说明：
- Key 校验在 server component 中进行，不匹配则 redirect 到首页
- 删除使用 Server Action（`use server`），通过 hidden input 传递 admin key
- 从邮件链接访问时，`?id=N` 参数高亮对应条目
- `dynamic = 'force-dynamic'` 确保每次访问都刷新列表

- [ ] **Step 2: typecheck 通过**

Run: `npx tsc --noEmit`
Expected: 无输出。

- [ ] **Step 3: dev server 验证 admin 页面**

Run:
```bash
curl -s http://localhost:3001/admin/guestbook?key=local-dev-key | head -20
```
Expected: 返回 HTML 包含 "Guestbook Admin" 标题。

验证错误 key 会 redirect：
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/admin/guestbook?key=wrong
```
Expected: `307`（redirect）。

- [ ] **Step 4: 提交**

```bash
git add app/admin/guestbook/page.tsx
git commit -m "admin: add guestbook admin page with key-gated delete"
```

---

### Task 14: 验证与发布

**Files:** (无新增文件)

- [ ] **Step 1: 完整 typecheck**

Run: `npx tsc --noEmit`
Expected: 无输出，无错误。

- [ ] **Step 2: 验证 dev server 所有相关页面**

确保 dev server 在运行：`npm run dev`（端口 3001）

逐个验证：

| URL | 验证点 |
|-----|--------|
| `/guestbook` | 页面加载、显示条数、CTA 按钮存在 |
| `/zh/guestbook` | 中文标题、中文 labels |
| `/` | 首页底部有 GuestbookHook section |
| `/zh` | 中文首页底部有 hook section |
| `/admin/guestbook?key=local-dev-key` | 显示条目列表、有 Delete 按钮 |

浏览器中打开 `/guestbook`，手动测试：
1. 点击 "Leave a stamp" 按钮 → 面板滑出
2. 填写 name + message，选择一个 stamp（有 glow 效果）
3. 点击 "Pour ink" → stamp drop 动画 → 新条目出现在列表顶部
4. 刷新页面 → 条目仍在（已写入 DB）

- [ ] **Step 3: 验证 API**

```bash
# POST 创建条目
curl -X POST http://localhost:3001/api/guestbook \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","message":"Hello from curl","stamp":"bear"}'

# 验证条目已保存（在页面或 admin 中查看）

# 验证 rate limit（连续发 6 次，第 6 次应返回 429）
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/guestbook \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test$i\",\"message\":\"Msg $i\",\"stamp\":\"bear\"}"
done
```

Expected: 前 5 次返回 `201`，第 6 次返回 `429`。

- [ ] **Step 4: 验证 honeypot**

```bash
curl -X POST http://localhost:3001/api/guestbook \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","message":"Spam","stamp":"bear","website":"example.com"}'
```
Expected: 返回 `400`。

- [ ] **Step 5: 验证 DELETE**

从 admin 页面复制一个条目的 ID，然后：
```bash
curl -X DELETE "http://localhost:3001/api/guestbook?id=1&key=local-dev-key"
```
Expected: 返回 `{"success":true}`。

用错误 key 测试：
```bash
curl -X DELETE "http://localhost:3001/api/guestbook?id=1&key=wrong"
```
Expected: 返回 `401`。

- [ ] **Step 6: 工作树检查**

Run: `git status`
Expected: 所有 guestbook 相关文件已提交，working tree clean。

- [ ] **Step 7: 部署前环境变量检查**

在 Vercel Dashboard 中确认以下环境变量已设置：

| Variable | Source |
|----------|--------|
| `POSTGRES_URL` | Vercel Postgres 自动注入 |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `GUESTBOOK_ADMIN_KEY` | 随机生成 32+ 字符字符串 |
| `IP_HASH_SALT` | 随机生成 32+ 字符字符串 |

- [ ] **Step 8: 推送部署**

```bash
git push origin main
```

Expected: Vercel 自动开始部署。

- [ ] **Step 9: 线上验证**

部署完成后，在线上环境重复 Step 2 的关键验证点（浏览 `/guestbook`、`/zh/guestbook`、首页 hook section）。

提交一条测试留言，确认：
1. 条目立即出现在页面上
2. 收到 Resend 邮件通知（检查 `aidan@jiuwoshanghai.net`）
3. 邮件中的 admin 链接可以打开并删除该条目

---

## 不在范围内

- **Reservation feature** — spec 中已明确 defer，[[project_design_locked]] 仍然准确
- **Cloudflare Turnstile** — 等 v1 上线后出现真实 spam 再添加
- **Infinite scroll / pagination** — 首版渲染全部条目，总量小时足够
- **Pre-moderation queue** — 明确拒绝，条目立即显示
- **Replies / threading / reactions** — v1 保持单向（访客→墙）
- **Photo / image attachments** — 仅 text + stamp
- **Multi-stamp per entry** — 每 entry 仅一个 stamp
- **Owner-marked / featured entries** — v1 无置顶
- **i18n of user-written content** — 用户输入原样显示，不翻译
