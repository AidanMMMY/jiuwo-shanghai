# JIUWO Shanghai — Agent Guide

> This file documents the architecture, conventions, and workflows for the JIUWO (啾喔) bar website. Read this before making any non-trivial changes.

---

## Project Overview

**JIUWO** is a bilingual (English / Chinese) marketing website for a Shanghai bar. It is built as a static-export Next.js application and deployed manually to an Alibaba Cloud ECS server.

- **Live site**: `http://47.96.0.252` (currently IP-based)
- **Languages**: English (`/`) and Chinese (`/zh`)
- **Content**: Bar info, photo gallery, drinks menu, journal/updates, and an interactive guestbook with stamped entries

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5.18 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5.9.3 |
| Styling | Tailwind CSS 4.2.1 + `tw-animate-css` |
| UI Components | shadcn/ui (`radix-nova` style) |
| Icons | Lucide React |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| Email | Resend |
| AI Integration | Moonshot AI (Kimi) via OpenAI-compatible client |
| Font | Inter (Google Fonts / Next.js font optimization) |

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Dev server (Turbopack)
npm run dev

# Production build
npm run build

# Type check (no emit)
npm run typecheck

# Lint
npm run lint

# Format all TS/TSX files
npm run format

# Kimi token usage report
npm run kimi-usage
# Clear Kimi usage history
npm run kimi-usage clear
```

---

## Project Structure

```
app/
  (en)/               # English route group (no URL prefix)
    page.tsx          # Homepage
    about/page.tsx
    gallery/page.tsx
    gallery/[album]/page.tsx
    guestbook/page.tsx
    menu/page.tsx
    updates/[slug]/page.tsx
    layout.tsx        # Navbar + Footer wrapper
  zh/                 # Chinese route group (URL prefix /zh)
    # Mirrors (en)/ exactly
  admin/guestbook/page.tsx  # Admin dashboard (query-param auth)
  api/
    guestbook/route.ts      # Guestbook CRUD + rate limiting
    kimi/route.ts           # Proxy to Moonshot AI API
  components/pages/   # Reusable page-level components (presentation layer)
  layout.tsx          # Root layout (Inter font, favicon swap script)
  globals.css         # Tailwind v4 theme + custom animations

components/
  ui/                 # shadcn/ui components (Button, etc.)
  stamps/             # SVG stamp components (Bear, Dog, Monkey, Pig, Wolf)
  # Shared components: Navbar, Footer, HeroCarousel, GalleryGrid, etc.

data/
  site.json           # Brand name, tagline, nav items, social links
  hero.json           # Hero carousel slides
  about.json          # Story, hours, address, map
  gallery.json        # Albums and photos
  menu.json           # Drink categories and items
  updates.json        # Journal entries (markdown content)

lib/
  data.ts             # All data fetching + bilingual localization
  utils.ts            # `cn()` helper + `markdownToHtml()`
  guestbook.ts        # Neon SQL client, DB operations, IP hashing
  email.ts            # Resend email notifications for new guestbook entries
  kimi/
    client.ts         # Moonshot API client
    usage.ts          # Token usage tracking (persists to `.kimi-usage.json`)
    useKimi.ts        # React hook for calling `/api/kimi`

scripts/
  kimi-usage.ts       # CLI to print/clear Kimi token usage
  automation/         # Playwright-based browser automation framework
    core/browser.mjs  # BrowserSession class (login, screenshots, anti-detection)
    tasks/example.mjs # Example automation task
    utils/page-analyzer.mjs
    config.mjs

public/
  images/             # Static images (logos, gallery photos, etc.)
```

---

## Routing & i18n Architecture

The project uses **route groups** for bilingual support instead of middleware or locale prefixes:

- **`app/(en)/`** — English pages at the root path (`/`, `/about`, `/gallery`, etc.). The parentheses exclude `en` from the URL.
- **`app/zh/`** — Chinese pages prefixed with `/zh` (`/zh`, `/zh/about`, etc.).

Each language group has its own `layout.tsx` that fetches localized site data (`getSiteData()` vs `getSiteDataZh()`).

### Pages & Data Sources

| Route | Page Component | Data Source |
|-------|---------------|-------------|
| `/` | `HomePage` | `site.json`, `hero.json`, `updates.json`, guestbook DB |
| `/about` | `AboutPage` | `about.json` |
| `/gallery` | `GalleryPage` | `gallery.json` |
| `/gallery/:album` | `GalleryAlbumPage` | `gallery.json` |
| `/guestbook` | `GuestbookPage` | guestbook DB |
| `/menu` | `MenuPage` | `menu.json` |
| `/updates/:slug` | `JournalPage` | `updates.json` |
| `/admin/guestbook` | (inline) | guestbook DB |

**Note**: There is no `/updates` index page. The journal stream lives exclusively on the homepage.

---

## Data Layer & Localization

All content lives in `data/*.json`. Each JSON file contains both English and Chinese fields (e.g., `title` / `titleZh`, `content` / `contentZh`).

`lib/data.ts` provides:
- Typed data accessors for every content type (`SiteData`, `HeroSlide`, `JournalEntry`, `GalleryAlbum`, `MenuCategory`, `AboutData`)
- A `*Zh()` variant for every accessor that swaps English fields for their `*Zh` counterparts
- `getJournalEntries()` filters out `hidden: true` entries and sorts by date descending

**Pattern**: When adding a new bilingual field, add both `field` and `fieldZh` to the JSON schema, then add a `localize*()` helper in `lib/data.ts`.

---

## Guestbook Feature

The guestbook is backed by a Neon Postgres table `guestbook_entries`:

- **Create**: `POST /api/guestbook` — validates name (1-30 chars), message (1-140 chars), and stamp against `ALLOWED_STAMPS`. Uses a honeypot field (`website`) for bot protection. Rate-limits by hashed IP (max 5 entries per 60 minutes). Sends a fire-and-forget admin email via Resend.
- **List**: `GET /api/guestbook` — returns all entries ordered by `created_at DESC`
- **Delete**: `DELETE /api/guestbook?id=&key=` — admin delete protected by `GUESTBOOK_ADMIN_KEY`

**Admin page**: `/admin/guestbook?key=YOUR_KEY` renders a server-side admin UI. It redirects to `/` if the key is missing or invalid.

---

## Kimi AI Integration

A proxy API at `POST /api/kimi` forwards requests to the Moonshot AI API (`api.moonshot.cn/v1`).

- `lib/kimi/client.ts` configures the OpenAI-compatible client
- `lib/kimi/useKimi.ts` is a React hook for client-side usage
- Token usage is recorded to `.kimi-usage.json` via `lib/kimi/usage.ts`

Required env vars: `KIMI_API_KEY`, `KIMI_BASE_URL` (defaults to Moonshot endpoint).

---

## Styling Conventions

- **Tailwind CSS v4** with CSS-native configuration (`@theme inline`, `@custom-variant`)
- **Color palette**: Dark theme only (`#0a0a0a` background, `#f5f5f0` foreground, `#c9a227` gold accent). The site does not currently mount a theme toggle, though `theme-provider.tsx` exists.
- **Custom utilities** in `globals.css`:
  - `.text-balance` — CSS text-wrap balance
  - `.scroll-reveal` / `.scroll-reveal-visible` — fade-in animation for `ScrollReveal` component
  - `@keyframes fadeInDown`
- **Responsive design**: Uses standard Tailwind breakpoints

### Prettier Config (`.prettierrc`)

- `semi: false`
- `singleQuote: false`
- `tabWidth: 2`
- `trailingComma: "es5"`
- `printWidth: 80`
- Plugin: `prettier-plugin-tailwindcss`

Always run `npm run format` before committing.

---

## Testing

**There is currently no test suite.** No Jest, Vitest, Playwright Test, or Cypress is configured.

The `scripts/automation/` directory contains a Playwright-based automation framework for browser tasks (screenshots, page analysis, form filling), but it is not used for automated testing.

---

## Deployment

Deployment is **manual** via `deploy.sh`:

1. Runs `npm run build` locally
2. Rsyncs the `dist/` directory to an Alibaba Cloud ECS server (`47.96.0.252:/var/www/jiuwo`)

**⚠️ Important discrepancy**: `deploy.sh` rsyncs `dist/`, but `next.config.ts` is currently empty and does **not** set `output: 'export'` or `distDir: 'dist'`. If static export is intended, `next.config.ts` must include:

```ts
const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
}
```

Without this, `next build` outputs to `.next/` instead of `dist/`, and `deploy.sh` will fail or deploy stale files.

**Nginx**: `nginx.conf` in the repo root is a reference config for the server. It handles SPA routing (`try_files $uri $uri.html $uri/ /index.html`) and sets 30-day cache headers for static assets.

**No CI/CD pipeline exists** (no GitHub Actions, Docker, or Vercel auto-deploy).

---

## Environment Variables

The following variables are expected in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Neon Postgres connection (guestbook) |
| `GUESTBOOK_ADMIN_KEY` | Query-param secret for admin guestbook access |
| `IP_HASH_SALT` | Salt for IP hashing in rate limiting |
| `RESEND_API_KEY` | Resend API key for guestbook email notifications |
| `KIMI_API_KEY` | Moonshot AI API key |
| `KIMI_BASE_URL` | Moonshot API endpoint (optional, has default) |

Do not commit `.env.local`.

---

## Security Considerations

- **Guestbook admin auth** is query-parameter based (`?key=...`), not cookie or session based. The admin page is accessible to anyone but redirects away without the correct key.
- **IP hashing** for rate limiting uses SHA-256 with a configurable salt. This is privacy-preserving but not cryptographically hardened against deliberate collision attacks.
- **Honeypot field** (`website`) is used for basic bot detection on the guestbook form.
- **No CSP headers** are currently configured.
- **No middleware** is used for auth, routing, or security.

---

## Common Patterns for Agents

### Adding a New Page

1. Create the server component in both `app/(en)/new-page/page.tsx` and `app/zh/new-page/page.tsx`
2. If the page needs shared presentation logic, add a component to `app/components/pages/`
3. Add navigation links to `data/site.json` (both `label` and `labelZh`)
4. Run `npm run typecheck` and `npm run lint`

### Adding a New JSON Data Field

1. Add the field to the relevant `data/*.json` file (add `*Zh` counterpart if bilingual)
2. Update the TypeScript type in `lib/data.ts`
3. Add a `localize*()` helper if the field needs Chinese localization
4. Update the `*Zh()` accessor to call the helper

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Components are placed in `components/ui/` and can be imported via `@/components/ui/<name>`.

### Working with the Guestbook DB

All DB operations go through `lib/guestbook.ts`. Do not write raw SQL in API routes or pages. The SQL client is lazy-initialized to avoid breaking builds when `POSTGRES_URL` is missing in development.

---

## Notes & Known Quirks

- **Theme provider unused**: `components/theme-provider.tsx` exists and wraps `next-themes`, but it is not imported in `app/layout.tsx`. The site uses a fixed dark aesthetic.
- **Favicon swap**: `app/layout.tsx` injects an inline script that swaps the favicon between light/dark versions based on `prefers-color-scheme`.
- **Root metadata stale**: `app/layout.tsx` still has `title: "Nameless Bar"` — the actual bar name is `JIUWO` / `啾喔` from `data/site.json`.
- **No `output: 'export'`**: As noted in Deployment, `next.config.ts` is empty. Ensure static export config is present before deploying.
- **Journal entries**: Use Markdown for `content` / `contentZh`. They are rendered to HTML via `remark` + `remark-html` in `lib/utils.ts`.
