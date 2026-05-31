# Guestbook with Stamps — Design

## Goal

Add an interactive guestbook to JIUWO's website so out-of-town visitors and one-time guests can leave a "我来过" trace — a short message stamped with a personal symbol — and so the homepage gains an emotional, low-stakes interaction point.

The interaction is built around a **stamping ritual**, not a generic comment form: the visitor writes a sentence, picks one of five animal stamps, then watches the stamp drop onto the page like ink. The visible artifact is the stamp itself — a visual signature that says "we were here." This is more aligned with the bar's "feels like a friend's living room" pull quote than a Disqus-style comment list would be.

Reservation features are explicitly **out of scope** for this iteration — that motivation (receiving non-WeChat visitors) was discussed but deferred again. This spec covers guestbook only.

## Decisions (from brainstorming)

| Concern | Choice |
| --- | --- |
| Form factor | Guestbook + stamp ritual (vs. polaroid wall / chalkboard / etc.) |
| Stamp set | 5 animals: 猴 monkey, 猪 pig, 狼 wolf, 狗 dog, 熊 bear |
| Stamp style | Circular gold (#c9a227) line-art SVG, ~48px, halftone "ink halo" around it |
| Discovery | Homepage hook section only — no navbar entry, no footer link |
| Hook placement | After Updates stream, before Footer |
| Standalone page | `/guestbook` + `/zh/guestbook` (server-rendered, no caching) |
| Submission gate | None — no login. Honeypot + IP rate-limit + manual deletion |
| Moderation | Post first, owner can delete via private admin page |
| Email notifications | Resend → `aidan@jiuwoshanghai.net` on each new entry |
| Database | Vercel Postgres |
| Email field on form | Optional, never displayed publicly |
| Character limits | Name ≤30, message ≤140 |
| Bilingual strategy | UI labels translated; user-written content stays as-written (no translation) |

## Architecture

### Data layer — Vercel Postgres

Single table. No relations.

```sql
CREATE TABLE guestbook_entries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30)  NOT NULL,
  message     VARCHAR(140) NOT NULL,
  stamp       VARCHAR(10)  NOT NULL,  -- 'monkey' | 'pig' | 'wolf' | 'dog' | 'bear'
  email       VARCHAR(120),            -- optional, never displayed
  ip_hash     VARCHAR(64)  NOT NULL,   -- SHA-256(ip + salt), for rate-limit only
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_guestbook_created_at ON guestbook_entries (created_at DESC);
CREATE INDEX idx_guestbook_ip_recent  ON guestbook_entries (ip_hash, created_at DESC);
```

IP is stored as a salted SHA-256, never the raw value. Salt lives in `IP_HASH_SALT` env var. Migration is a one-shot SQL run via Vercel Postgres dashboard or a `migrations/001_guestbook.sql` file applied manually.

### API layer — `app/api/guestbook/route.ts`

Two methods on the same route:

- **POST** — Create a new entry
  - Validate: name 1-30, message 1-140, stamp ∈ allowed set, email empty or valid, honeypot field `website` must be empty
  - Hash IP via `crypto.subtle` + salt
  - Query: same `ip_hash` posted ≥5 entries in the last 60 minutes? → reject with 429
  - Insert row; fire-and-forget email via Resend
  - Return the new entry JSON (no email field in response)
- **DELETE** — Remove an entry (admin only)
  - Requires `?id=N&key=<GUESTBOOK_ADMIN_KEY>` matching env var
  - Single DB delete, return 200 / 404

Both run on the Node runtime (Postgres SDK requires Node, not Edge).

### Frontend — Standalone page

**`app/(en)/guestbook/page.tsx`** and **`app/zh/guestbook/page.tsx`** — server components, no caching (`export const dynamic = 'force-dynamic'`). Each fetches the full entries list ordered by `created_at DESC` and passes it to a shared `<GuestbookPage>` view component along with locale labels.

**`app/components/pages/GuestbookPage.tsx`** — layout matches the editorial style of `/about`:

```
GUESTBOOK / 客言
Leave a mark on the wall

[ 留下印章 / Leave a stamp ]   ← primary CTA button

─── 247 stamps ───              ← total count, atmospheric

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Best night of the trip."
        — Sarah · 2 days ago        [🐻]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"风月好看. 来啦"
        — A · 5 days ago             [🐺]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

- `max-w-2xl` column (matches About page)
- Each entry: message (cream `#f5f5f0`), name + relative date in gold `#c9a227`, stamp icon bottom-right
- Thin gold separators between entries
- Infinite scroll deferred to v2 — first cut renders all entries (volume is small)

**`components/StampPanel.tsx`** (client) — the writing panel. Opens as a slide-up modal overlay when CTA is clicked.

Steps inside the panel:
1. Name input + message textarea + optional email input
2. Five circular stamp buttons in a row; clicking one selects it (slight scale + glow ring)
3. "Pour ink / 盖章" submit button enables only when name, message, stamp are filled
4. On submit:
   - POST to `/api/guestbook`
   - Show stamp drop animation (selected stamp falls from above, bounces, ink halo expands)
   - Slide panel away
   - Newly-created entry animates into the top of the list (fade + slide-down)

If the API returns a rate-limit 429: show a quiet inline message "You've left a few stamps already — try again in a bit." / "已经留下好几个章了,稍后再来吧。"

**`components/GuestbookHook.tsx`** (server, included in `HomePage`) — homepage hook section:

```
                ─── 247 stamps so far ───

      "Best night of the trip."           [🐻]
      "风月好看. 来啦"                     [🐺]
      "First time in Shanghai, found this place by chance."  [🐺]

              [ Leave your own → ]
```

- Sits between Updates and Footer
- Pulls the latest 3 entries + total count
- `export const revalidate = 60` (1-minute cache to avoid hammering the DB on every homepage hit)
- Button links to `/guestbook` (English) or `/zh/guestbook`

### Stamps — SVG assets

Five files in `public/stamps/` or `components/stamps/`:

```
monkey.svg
pig.svg
wolf.svg
dog.svg
bear.svg
```

Each:
- `viewBox="0 0 48 48"`
- Single-color line art on transparent background
- Default color `currentColor` so the component can drive gold via CSS
- Circular outer ring + animal silhouette inside
- Optimized via SVGO (no metadata, no comments)

Hand-drawn or hand-vectorized aesthetic is preferred — geometric/icon-pack art would feel sterile. If time permits, source from a single illustration set or commission/hand-draw to keep style consistent across all five.

The "ink halo" effect is CSS, not part of the SVG: a `box-shadow` or radial gradient sibling element behind the SVG, rendered when the stamp is placed/selected.

### Bilingual strategy

- UI labels (CTA text, placeholders, "X stamps", error messages, time formatting) are passed as props from each locale's page, same pattern as `AboutPage`
- User-written `name` and `message` are stored as-is and rendered as-is — no translation, no language detection
- Both `/guestbook` and `/zh/guestbook` show the same global stream of entries; only the UI chrome differs
- Relative date formatting ("2 days ago" / "2 天前") is rendered server-side from `created_at` using a small bilingual helper in `lib/guestbook.ts`. No client-side `Intl.RelativeTimeFormat` to avoid hydration mismatches.

Stamp labels in English/Chinese (used only for accessibility / alt text):

| ID | EN | ZH |
|---|---|---|
| monkey | Monkey | 猴 |
| pig | Pig | 猪 |
| wolf | Wolf | 狼 |
| dog | Dog | 狗 |
| bear | Bear | 熊 |

## User Flow

1. Visitor scrolls past hero + Updates on the homepage
2. Sees `GuestbookHook` section with 3 recent entries and total count
3. Clicks "Leave your own →" → navigates to `/guestbook`
4. Reads existing entries, then clicks "Leave a stamp" CTA at the top
5. Modal opens; types name + one sentence
6. Picks one of five animal stamps; selected stamp glows
7. Clicks "Pour ink"
8. Stamp drops, ink halo expands; entry appears at top of the list
9. (Owner receives email notification within seconds)

## Anti-spam strategy

Three layers, ordered cheapest-first:

1. **Honeypot field** — hidden `<input name="website">` styled `display:none`. Real users never fill it; most simple bots will. Server rejects any submission where `website` is non-empty.
2. **IP rate limit** — `ip_hash` based check: same hashed IP can post up to **5 entries per hour**; 6th submission within the window gets 429. (Generous enough that a group of friends on the same WiFi can each leave a stamp.)
3. **Cloudflare Turnstile** (deferred) — invisible captcha, accessible from China, free. Only add if real spam appears in v1.

No bad-word filter, no content classifier. Manual deletion via admin page is the safety net.

## Moderation strategy

- **No pre-moderation.** Entries appear immediately on submission. The "I came" reward is the visible stamp; gating that breaks the core motivation.
- **Email notification** — Resend sends owner an email per new entry containing name, message, stamp, and a one-click link to the admin page filtered to that entry.
- **Private admin page** — `/admin/guestbook?key=<GUESTBOOK_ADMIN_KEY>` (also `/admin/guestbook/[id]?key=...` for direct entry view from email). Shows all entries with a delete button each. Simple key check — not Clerk, not OAuth.
- **Fallback** — if admin page is unavailable, owner can delete via Vercel Postgres dashboard.

## Email notifications

- Service: Resend (free tier 100/day)
- Sender: `noreply@jiuwoshanghai.net` (requires SPF + DKIM on the domain — one-time DNS setup via Aliyun)
- Recipient: `aidan@jiuwoshanghai.net`
- Format: plain text + a small HTML version. Subject: "New stamp in guestbook — {name}"
- Body includes: name, message, stamp emoji, relative time, IP hash (last 8 chars, for traceability), and a direct admin link with the key pre-filled

The send is fire-and-forget — if Resend fails or returns 5xx, the entry still saves and the user-facing flow doesn't break. Errors are logged to Vercel function logs.

## Out of Scope

- **Reservation feature** — discussed, deferred again. Memory entry `project_design_locked.md` remains accurate for reservations specifically.
- **Login / accounts / user profiles** — explicitly not added. Anyone can leave a stamp; identity is whatever name they type.
- **Replies / threading / reactions** — keep it one-way (visitor → wall). No "carry a glass" / emoji reactions in v1.
- **Photo / image attachments** — text + stamp only.
- **Pagination / infinite scroll** — first cut renders all entries. Add when total > ~200.
- **Pre-moderation queue** — explicitly rejected (see Moderation).
- **Cloudflare Turnstile** — defer until real spam appears.
- **Multi-stamp per entry** — exactly one stamp per entry. Simpler interaction.
- **Owner-marked / featured entries** — no pinning or favoriting in v1.
- **i18n of user-written content** — stored and shown as-written, no auto-translation.

## Files Touched / Created

**New:**
- `migrations/001_guestbook.sql` — DB schema (run once via Vercel Postgres dashboard)
- `app/(en)/guestbook/page.tsx`
- `app/zh/guestbook/page.tsx`
- `app/api/guestbook/route.ts` — POST + DELETE handlers
- `app/admin/guestbook/page.tsx` — admin list with delete buttons (key-gated)
- `app/components/pages/GuestbookPage.tsx` — shared layout view
- `components/StampPanel.tsx` — client-side writing panel + animation
- `components/GuestbookHook.tsx` — homepage hook section
- `components/StampIcon.tsx` — thin wrapper that picks the right SVG by stamp ID
- `components/stamps/monkey.svg`, `pig.svg`, `wolf.svg`, `dog.svg`, `bear.svg`
- `lib/guestbook.ts` — DB query helpers (`createEntry`, `listEntries`, `deleteEntry`, `countEntries`, `recentForIp`)
- `lib/email.ts` — Resend wrapper for the notification (small, self-contained)

**Modified:**
- `app/components/pages/HomePage.tsx` — accept `guestbookHook` data + labels props; render `<GuestbookHook />` after `<JournalStream />`
- `app/(en)/page.tsx` — fetch latest 3 entries + total count, pass EN labels
- `app/zh/page.tsx` — same, pass ZH labels
- `package.json` — add `@vercel/postgres`, `resend`
- `.env.local` (and Vercel env settings) — add new env vars

## Environment variables

| Var | Where set | Purpose |
|---|---|---|
| `POSTGRES_URL` | Vercel auto-injected when Postgres is linked | DB connection |
| `RESEND_API_KEY` | Vercel dashboard + `.env.local` | Email sending |
| `GUESTBOOK_ADMIN_KEY` | Vercel dashboard + `.env.local` | Admin page gate |
| `IP_HASH_SALT` | Vercel dashboard + `.env.local` | IP hashing salt (any random 32+ char string) |

All four are required at runtime. Add lazy checks in `lib/guestbook.ts` and `lib/email.ts` so the absence of `RESEND_API_KEY` in local dev doesn't break the build.
