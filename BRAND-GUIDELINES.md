# KidsChores Brand Guidelines — v2 "Midnight + Electric"

> v2 (2026-07-11) replaces the "Modern Warm Minimal" / Duolingo-inspired system.
> Design brief: **modern and sleek, geared to a young audience (mixed ages incl.
> teens), never a children's game.** References: Step, PS5, Spotify, Apple
> Fitness. Retired outright: the Chorbie mascot, seasonal themes/particles,
> emoji-as-UI, rainbow gradient cards, gold cartoon stars, confetti-storm
> celebrations.

## Core principle

**Neutral shell, one hero accent, color carried by content and status — never
by the UI chrome.** A kid's identity is an accent hue applied to details
(avatar ring, points numerals, progress ring, card edge), not a colored block.

## Logo

The mark is a **geometric four-point spark** — faceless, no character. It is
rendered by `frontend/src/components/Logo.tsx` (self-contained SVG + wordmark;
no raster asset pipeline). Variants: `icon` (spark), `wordmark` ("KidsChores"
in Space Grotesk, "Chores" in hero cyan), `stacked`, `horizontal`. The favicon
suite (`frontend/public/`) is the spark on a #0B0E14 rounded square.

The legacy `kc-*` SVG assets in `frontend/src/assets/logo/` are retired
(kept only for history).

## Color

Dark is the **flagship theme and the default**; light is a derived variant for
bright rooms. All values live in `frontend/src/index.css` (`:root` = light,
`.dark` = dark) and `frontend/src/theme/colors.ts`.

### Dark (flagship)

| Token | Value | Role |
|---|---|---|
| `--bg-base` | `#0B0E14` | App background |
| `--bg-surface` | `#141922` | Cards |
| `--bg-elevated` | `#1B2230` | Raised cards (kid cards) |
| `--border-color` | `#262E3D` | Hairlines |
| `--text-primary/secondary/muted` | `#F4F6FB` / `#A7B0C0` / `#8A93A6` | Text ramp |
| `--primary-500` | `#38E1FF` | **Hero accent** (electric cyan) — CTAs, active nav, focus |
| `--accent-500` | `#B6F400` | **Volt** — positive points, rewards |
| `--celebration` | `#FB7185` | Danger/destructive |
| `--streak-from → --streak-to` | `#FDBA74 → #F0468B` | Streak flame gradient |
| Tier metals | bronze `#8A5A2B→#C9884A`, silver `#8F98A8→#DFE5EE`, gold `#A8842E→#E7C66B` | Badge/level art |

### Light (derived)

Cool paper `#F2F4F7` / white cards / ink `#101828`; hero deepens to `#0891B2`,
volt deepens to `#5C8A00`. Same structure, same accent discipline.

### Per-kid accents (6)

Defined as `.kid-<id>` classes setting `--kid-accent` / `--kid-accent-soft`
(dark / light values): **cyan** `#38BDF8/#0284C7`, **violet** `#A78BFA/#7C3AED`,
**magenta** `#FB6FB1/#DB2777`, **lime** `#A3E635/#4D7C0F`,
**coral** `#FF7A6B/#EA580C`, **amber** `#FBBF24/#D97706`.
Legacy ids (ocean, berry, grape, gold, …) alias onto these. Consume via
`var(--kid-accent)` / the `.kid-accent-text`, `.kid-avatar-ring`, `.kid-card`
helpers — never hardcode a kid hex in a component.

### Saturation discipline

Accent color occupies ~10% of any screen. Never run 3+ saturated hues in one
component. Semantic colors (approved/pending/claimed/overdue) are separate
from the hero accent and don't count against it.

## Typography

- **Display: Space Grotesk 500–700** (`--font-display`, `.font-display`,
  `h1/h2`, `.stat-number`) — headings, points/streak numerals (tabular).
- **Body: Inter 500–900** — everything else.
- Sentence case; tight tracking on display sizes; no ALL-CAPS bubble text
  except small `.uppercase tracking-wide` section labels.

## Shape & depth

- Radius: `--neo-radius: 0.75rem` default; kid cards `1rem`. No candy pills.
- Depth: 1px hairline borders + one soft shadow (`--neo-shadow`); the kid card
  adds an inset 3px accent edge. No thick colored drop shadows, no bevels.

## Gamification art

- **Badges**: lucide icon on a **metal-tier chip** (`.tier-bronze/silver/gold`,
  `.tier-gold-glow` for legendary). Never emoji, never rainbow circles.
- **Streaks**: flame icon + gradient-text count (`.streak-flame`).
- **Progress**: conic **rings** (`.ring-progress`, `--ring-pct`/`--ring-color`),
  colored by the kid accent; completed = success green.
- **Celebrations**: brief, restrained — confetti uses the 5-color brand set
  (cyan, volt, violet, magenta, amber), ~28 pieces; full-screen moments only
  for genuinely rare events (badge unlock, streak milestone).

## Iconography

Two tiers (since v0.12):

- **Content icons** (chores, categories, rewards, challenge/badge icon values —
  anything a family picks or the DB stores): **full-color Twemoji artwork**,
  vendored in `frontend/src/data/twemoji-icons.tsx` (regenerate with
  `frontend/scripts/fetch-twemoji.mjs`; CC-BY 4.0 attribution lives on the
  Help page + README). Natural colors are the point — a pizza is red, a dog is
  brown. Artwork ignores text-color classes; put tint on the CHIP behind it,
  never expect the glyph to recolor.
- **UI chrome** (nav, buttons, form affordances, close/edit/check controls):
  **monochrome lucide** line icons at consistent stroke — the sleek frame stays.

Stored icon values are STILL the stable lucide-kebab names from the curated
catalog (`frontend/src/data/icon-catalog.ts` — v0.11's vocabulary; only the
rendered artwork changed), chosen via `IconPicker` and rendered ONLY through
`DynamicIcon`. Legacy emoji in old data is migrated at startup
(`backend/app/migrations/icon_migration.py`); unmapped custom emoji still
renders as a grandfathered value until edited. **No NATIVE emoji as UI** —
platform emoji fonts render inconsistently; Twemoji artwork is the sanctioned
way to get emoji warmth.

## Motion

Quick physics: 150–350ms fades/scale, spring without overshoot. No cartoon
bounce, no squash-and-stretch, no wiggle. `prefers-reduced-motion` disables
everything non-essential (global kill-switch in index.css).

## Voice

Confident and warm, not babyish: "All done — nice." over "Yay!!! 🎉".
Controls say exactly what happens ("Claim chore").

## CSS architecture note — cascade layers

Custom component classes (`.card`, `.btn*`, `.kid-card`, inputs, badges) are
defined inside `@layer components` in `index.css` so Tailwind utilities (a
later layer) can override them. **Never define a reusable component class
outside a layer** — unlayered CSS silently beats every utility (`bg-*`,
`text-*`) applied next to it; that's how v0.10.0 shipped an invisible
white-on-white card. Text color must never come from stored/user data —
category/kid colors are decorative (backgrounds, borders, dots); text uses
theme tokens (axe `color-contrast` gates this in CI via `e2e/ui/contrast.spec.ts`).

## Accessibility

- Text ramps annotated WCAG AA+ in index.css; verify any new pairing with
  `meetsWCAG()` in `theme/colors.ts`.
- 3px `focus-visible` ring everywhere (hero accent).
- 48px touch targets (`.touch-target`) for kid-facing controls.
- All progress/status must read without color alone (numbers + labels).
