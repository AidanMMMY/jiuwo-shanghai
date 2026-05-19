# Rainbow Intro Highlight — Design

## Goal

Highlight the closing phrase of the hero intro line with a diagonal rainbow gradient — a subtle hint that JIUWO is a queer-friendly / gay bar — while keeping the rest of the line in the existing off-white color.

- EN intro: `Tea, Wine, Cocktails, and MUCH MORE` → rainbow on `MUCH MORE`
- ZH intro: `小酒吧，啥都有，全是朋友` → rainbow on `全是朋友`

Hero photos are dark, so the gradient must use saturated, high-luminance colors for readability.

## Decisions (from brainstorming)

| Concern | Choice |
| --- | --- |
| Gradient angle | 60° |
| Palette | Neon-leaning pride palette (#ff3d6e, #ff8a2e, #ffe14d, #2ed47a, #4fb3ff, #b46cff) |
| Animation | Background-position drift, 10s linear loop |
| Locale strategy | Different highlight phrase per locale, marked in source data |
| Marking syntax | `[[...]]` in the JSON intro strings |
| Accessibility | Animation halts under `prefers-reduced-motion: reduce`; static gradient remains |

## Architecture

### Data layer — `data/site.json`

Wrap the highlight phrase in double brackets. The marker is content-level metadata; it travels with the localized string and stays editable without touching the component.

```json
{
  "intro": "Tea, Wine, Cocktails, and [[MUCH MORE]]",
  "introZh": "小酒吧，啥都有，[[全是朋友]]"
}
```

No type change in `lib/data.ts` — `intro` and `introZh` remain plain strings.

### Render layer — `components/HeroCarousel.tsx`

Replace the current `{intro}` text node with a small helper that splits the string on `[[...]]` markers and wraps each highlighted segment in a styled span. Plain segments render as raw text.

```tsx
function renderIntro(text: string) {
  return text.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
    part.startsWith('[[') && part.endsWith(']]')
      ? <span key={i} className="rainbow-text">{part.slice(2, -2)}</span>
      : part
  );
}

// Usage in the existing <p> tag:
<p className="hero-intro-fade-up text-base ...">{renderIntro(intro)}</p>
```

Edge cases:
- Intro with no markers → split returns a single element, rendered as plain text. No regression.
- Multiple markers in one string → all get the rainbow class.
- Empty marker `[[]]` → handled by the regex requiring at least one non-`]` char.

### Style layer — same file, inside the existing `<style jsx>`

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
@media (prefers-reduced-motion: reduce) {
  .rainbow-text { animation: none !important; }
}
```

Notes:
- The gradient repeats its first color at 100% so the keyframe loop closes without a visible seam.
- `background-size: 300% 100%` plus a 300% position sweep gives one full color cycle per loop.
- `text-shadow` adds a hairline white halo, helping the saturated mid-tones (especially yellow) stay legible on dim hero stills.

### Accessibility

- Animation stops under `prefers-reduced-motion: reduce`, matching the existing `.tagline-shimmer` / `.hero-intro-fade-up` handling already in `HeroCarousel.tsx`.
- The rainbow span has no `aria-*` attributes — the text is read normally; the gradient is purely visual.
- Color is not the only carrier of meaning (the phrase reads the same in screen readers).

## Out of Scope

- Other places that render `intro` / `introZh` — none currently exist beyond `HeroCarousel`, so no second consumer needs updating.
- Tagline (`Drink on me, the stars are watching` / `风月好看 人间浪漫`) styling — unchanged.
- Footer or nav bar — unchanged.
- New JSON fields or schema — none.

## Files Touched

- `data/site.json` — wrap highlight phrases with `[[...]]` in two values.
- `components/HeroCarousel.tsx` — add `renderIntro` helper, use it in the intro `<p>`, append `.rainbow-text` rule + keyframes + reduced-motion guard to the inline style block.

Total: ~30 lines added in one component, two two-character edits in one JSON file.
