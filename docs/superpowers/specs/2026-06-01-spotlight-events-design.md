# Drink Spotlight + Event Calendar — Design Spec

**Date:** 2026-06-01  
**Branch:** `feature/spotlight-events`  
**Scope:** Home page content sections — Drink Spotlight (Bartender's Pick) + Event Calendar

---

## Overview

Add two content-driven sections to the homepage to increase freshness and give visitors a reason to return:

1. **Drink Spotlight** — A featured drink highlight with photo, description, and bartender's note. Rotatable monthly or ad-hoc.
2. **Event Calendar** — A lightweight upcoming events list. Auto-hides past events.

Both sections follow existing brand constraints (pure black #0a0a0a, gold #c9a227, cream #f5f5f0) and the bilingual JSON-first content strategy.

---

## 1. Drink Spotlight

### Position
Home page, between **Journal Stream** and **Guestbook Hook**.

### Layout

**Desktop (≥768px):** Two-column, image-left / text-right, 50/50 split.  
**Mobile (<768px):** Stacked, image on top, text below.

```
┌─────────────────────────────────────────────────────┐
│  [Drink Photo]              │  BARTENDER'S PICK      │
│  (object-cover, full        │  ─────────────────     │
│   height of section)        │                        │
│                             │  尼格罗尼              │
│                             │  Negroni               │
│                             │  [鸡尾酒 · Cocktail]   │
│                             │                        │
│                             │  一句话描述文案...      │
│                             │  调酒师推荐语...        │
│                             │                        │
│                             │  → View on Menu        │
└─────────────────────────────────────────────────────┘
```

### Visual Details

| Element | Specification |
|---------|--------------|
| Section background | `#0a0a0a` (same as page) |
| Section padding | `py-20 md:py-28` |
| Max width | `max-w-7xl mx-auto` |
| Image | `aspect-[4/5]` on mobile, full height on desktop; `object-cover` |
| Image border | subtle `border border-white/5` |
| Title "BARTENDER'S PICK" | `text-xs tracking-[0.2em] text-[#c9a227]` |
| Drink name (EN) | `font-serif text-4xl md:text-5xl text-[#f5f5f0]` (Playfair Display) |
| Drink name (ZH) | `text-xl md:text-2xl text-[#a0a0a0] mt-2` |
| Category tag | `text-[10px] tracking-[0.15em] border border-[#c9a227]/30 text-[#c9a227] px-3 py-1` |
| Description | `text-sm md:text-base text-[#d0d0d0] leading-relaxed mt-6` |
| Story/bartender note | `text-sm text-[#808080] italic mt-4` |
| CTA link | `text-sm text-[#c9a227] hover:text-[#f5f5f0] transition-colors mt-8 inline-flex items-center gap-2` |
| CTA arrow | `→` with `group-hover:translate-x-1` micro-animation |

### Image Treatment
The drink photo should be a **vertical portrait shot** (tall glass, dark background, dramatic lighting). This creates visual contrast with the landscape Hero carousel above and the text-heavy sections around it.

Recommended aspect ratio: **3:4 or 4:5**.

---

## 2. Event Calendar

### Position
Home page, between **Drink Spotlight** and **Guestbook Hook**.

### Layout

**All breakpoints:** Vertical list, one event per row. Compact but scannable.

```
┌─────────────────────────────────────────────────────┐
│  UPCOMING EVENTS          近期活动                    │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  JUN 15      Guest Bartender Night                 │
│  ━━━━━━━     客座调酒师之夜                         │
│              来自香港的特邀调酒师，带来招牌鸡尾酒。    │
│                                                     │
│  JUN 22      New Wine Tasting                      │
│  ━━━━━━━     新酒品鉴会                             │
│              本周新到 3 款自然酒，欢迎来尝。          │
│                                                     │
│  [past events auto-hidden — no manual cleanup]      │
└─────────────────────────────────────────────────────┘
```

### Visual Details

| Element | Specification |
|---------|--------------|
| Section background | `#0a0a0a` |
| Section padding | `py-16 md:py-20` |
| Max width | `max-w-4xl mx-auto` (narrower than Spotlight for readability) |
| Section title | `text-xs tracking-[0.2em] text-[#c9a227]` |
| Divider line | `border-t border-white/10 mt-4 mb-8` |
| Event row | `flex gap-6 md:gap-10 py-6 border-b border-white/5` |
| Date block | `w-16 flex-shrink-0 text-center` |
| Month (EN) | `text-[10px] tracking-[0.15em] text-[#808080] uppercase` |
| Day number | `text-3xl md:text-4xl font-serif text-[#f5f5f0]` |
| Day underline | `w-8 h-px bg-[#c9a227] mx-auto mt-1` |
| Event title (EN) | `text-lg md:text-xl text-[#f5f5f0]` |
| Event title (ZH) | `text-sm text-[#a0a0a0] mt-1` |
| Description | `text-sm text-[#808080] mt-2 leading-relaxed` |
| Empty state | `text-sm text-[#505050] italic` — "No upcoming events. Check back soon!" / "近期暂无活动，敬请期待！" |

### Empty State
When no upcoming events exist, show a single centered line of text instead of an empty list.

---

## 3. Data Schema

### `data/featured.json`

```json
{
  "titleEn": "Bartender's Pick",
  "titleZh": "调酒师之选",
  "current": {
    "nameEn": "Negroni",
    "nameZh": "尼格罗尼",
    "category": "cocktails",
    "categoryLabelEn": "Cocktail",
    "categoryLabelZh": "鸡尾酒",
    "descriptionEn": "A classic Italian cocktail with equal parts gin, Campari, and sweet vermouth. Bold, bitter, and perfectly balanced.",
    "descriptionZh": "经典意大利鸡尾酒，金酒、金巴利和甜味美思等量调和。浓烈、苦涩、完美平衡。",
    "storyEn": "Our bartender Zack's go-to drink when he wants something with character.",
    "storyZh": "调酒师 Zack 想喝点有性格的时的首选。",
    "image": "/images/featured/negroni.jpg",
    "menuLink": "/menu#cocktails"
  }
}
```

**Field notes:**
- `category` maps to menu category keys for potential deep-linking. Values: `cocktails`, `sparkling`, `white`, `red`, `btg`, `tea`.
- `menuLink` is optional; falls back to `/menu` if absent.
- `storyEn` / `storyZh` are optional; omit if not applicable.

### `data/events.json`

```json
{
  "events": [
    {
      "date": "2026-06-15",
      "titleEn": "Guest Bartender Night",
      "titleZh": "客座调酒师之夜",
      "descriptionEn": "Special guest from Hong Kong mixing signature cocktails.",
      "descriptionZh": "来自香港的特邀调酒师，带来招牌鸡尾酒。",
      "type": "special"
    }
  ]
}
```

**Field notes:**
- `date` format: ISO 8601 (`YYYY-MM-DD`). Events with `date < today` are automatically filtered out client-side.
- `type` is reserved for future styling differentiation (e.g., `special`, `tasting`, `holiday`). Default rendering treats all types identically.
- `events` array may be empty; the component handles this gracefully.

---

## 4. Component Architecture

### New Components

| Component | Path | Responsibility |
|-----------|------|---------------|
| `DrinkSpotlight` | `components/DrinkSpotlight.tsx` | Renders featured drink section with image + text |
| `EventCalendar` | `components/EventCalendar.tsx` | Renders upcoming events list with auto-filtering |

### Integration Points

- **HomePage** (`app/components/pages/HomePage.tsx`): Import and render `<DrinkSpotlight />` and `<EventCalendar />` between `<JournalStream />` and `<GuestbookHook />`.
- **Data loading** (`lib/data.ts`): Add `loadFeatured()` and `loadEvents()` functions following existing pattern (read JSON, parse with zod).

### Data Flow

```
page.tsx (server)
  └── loadFeatured() → data/featured.json
  └── loadEvents() → data/events.json
  └── passes data as props to HomePage

HomePage (server)
  └── <DrinkSpotlight featured={featured} />
  └── <EventCalendar events={events} />
```

All data loading happens at the page level (server component), following existing architecture.

---

## 5. Type Definitions

Add to `lib/data.ts` or a new `types/featured.ts`:

```typescript
export interface FeaturedDrink {
  nameEn: string;
  nameZh: string;
  category: string;
  categoryLabelEn: string;
  categoryLabelZh: string;
  descriptionEn: string;
  descriptionZh: string;
  storyEn?: string;
  storyZh?: string;
  image: string;
  menuLink?: string;
}

export interface FeaturedData {
  titleEn: string;
  titleZh: string;
  current: FeaturedDrink;
}

export interface EventItem {
  date: string; // YYYY-MM-DD
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  type?: string;
}

export interface EventsData {
  events: EventItem[];
}
```

---

## 6. Image Asset Requirements

| Asset | Path | Format | Notes |
|-------|------|--------|-------|
| Featured drink photo | `public/images/featured/{slug}.jpg` | JPG, lowercase extension | Vertical portrait, dark background, dramatic lighting |

**Image size guideline:** 800×1000px or similar 3:4 / 4:5 ratio. Compressed to <200KB for fast loading.

---

## 7. Responsive Behavior

| Breakpoint | Drink Spotlight | Event Calendar |
|-----------|-----------------|----------------|
| < 640px | Stacked (image top, text below), full width | Single column, compact date block |
| 640–1023px | Stacked, max-width container | Single column |
| ≥ 1024px | Two-column 50/50 split | Single column (centered, max-w-4xl) |

---

## 8. Accessibility

- All images have descriptive `alt` text (drink name).
- CTA link has clear text label (not just "→").
- Date information is readable by screen readers (not just visual).
- Respect `prefers-reduced-motion`: no entrance animations if user prefers reduced motion.

---

## 9. Maintenance Workflow

### Updating Featured Drink
1. Take photo of new featured drink → save to `public/images/featured/{name}.jpg`
2. Edit `data/featured.json` → replace `current` object
3. Commit + push → auto-deploy to Vercel

### Adding/Removing Events
1. Edit `data/events.json` → add/remove event objects
2. No need to delete past events (filtered automatically), but cleaning up keeps JSON tidy
3. Commit + push → auto-deploy

### Frequency
- **Featured drink:** Monthly or whenever there's a new highlight
- **Events:** As needed (before each event)

---

## 10. Out of Scope (Future Considerations)

- Historical archive of past featured drinks
- RSVP/booking integration for events
- Recurring events (e.g., "Every Friday Jazz Night")
- Social sharing buttons for individual events
- Image carousel for multiple featured drinks

---

## Approval

Design approved by user on 2026-06-01.
