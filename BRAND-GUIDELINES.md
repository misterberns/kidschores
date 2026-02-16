# KidsChores Brand Guidelines

## Logo

### Variants

| Variant | File Prefix | Use Case |
|---------|-------------|----------|
| Icon | `kc-icon` | Favicon, app icon, small spaces |
| Wordmark | `kc-wordmark` | Text-only contexts, wide layouts |
| Stacked | `kc-logo-stacked` | Login/splash screens, centered layouts |
| Horizontal | `kc-logo-horizontal` | App header, navigation bars |

Each variant has light and dark versions (suffix `-dark`).

### Minimum Sizes

| Variant | Min Width |
|---------|-----------|
| Icon | 32px |
| Wordmark | 120px |
| Stacked | 140px |
| Horizontal | 200px |

### Clear Space

Maintain padding equal to the icon height on all sides. Do not place other elements within this zone.

### Do / Don't

- **Do** use the provided SVG/PNG files
- **Do** use the theme-aware `<Logo>` component in React
- **Don't** stretch or distort the logo
- **Don't** change the logo colors
- **Don't** place the logo on busy backgrounds without contrast
- **Don't** add effects (shadows, outlines) to the logo

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Feather Green | `#58CC02` | Primary brand, "Kid" wordmark, buttons |
| Sky Blue | `#1CB0F6` | Secondary brand, "Chores" wordmark, links |

### Light Mode Palette

| Name | Hex | CSS Variable |
|------|-----|-------------|
| Warm Cream | `#F0EDE8` | `--bg-base` (neobrutalist base) |
| White | `#FFFFFF` | `--bg-surface` (card backgrounds) |
| Near Black | `#1A1A1A` | `--text-primary`, `--border-color` |
| Feather Green | `#58CC02` | `--primary-500` |
| Sky Blue | `#1CB0F6` | `--secondary-500` |
| Warm Orange | `#FF9600` | `--accent-500` |

### Dark Mode Palette (Electric Neon)

| Name | Hex | CSS Variable |
|------|-----|-------------|
| OLED Black | `#0A0A0F` | `--bg-base` |
| Cool Surface | `#141420` | `--bg-surface` |
| Neon Green | `#39FF14` | `--primary-500`, `--border-color` |
| Electric Cyan | `#00D4FF` | `--secondary-500` |
| Neon Orange | `#FF6B35` | `--accent-500` |
| Electric Pink | `#FF2D55` | `--celebration` |

### Kid Colors (8 Vibrant Gradients)

| Name | Hex | CSS Variable |
|------|-----|-------------|
| Feather Green | `#58CC02` | `--primary-500` |
| Sky Blue | `#1CB0F6` | `--info-500` |
| Fire Red | `#FF4B4B` | `--danger-500` |
| Bee Yellow | `#FFC800` | `--warning-500` |
| Mask Purple | `#CE82FF` | `--purple-500` |
| Fox Orange | `#FF9600` | `--orange-500` |

### Dark Mode Adjustments

In dark mode, brand colors shift to electric neon for maximum contrast:
- Feather Green: `#58CC02` -> `#39FF14` (neon green)
- Sky Blue: `#1CB0F6` -> `#00D4FF` (electric cyan)
- Orange: `#FF9600` -> `#FF6B35` (neon orange)

## Typography

### Font Stack

- **Logo**: Fredoka (converted to SVG path outlines — no font dependency at runtime)
- **App UI**: Inter 500-900 (`'Inter', system-ui, -apple-system, sans-serif`)

### Hierarchy

| Level | Size | Weight | Style | Usage |
|-------|------|--------|-------|-------|
| H1 | 2rem | Black (900) | Uppercase, tracking-tight | Page titles |
| H2 | 1.5rem | Bold (700) | | Section headers |
| Body | 1rem | Medium (500) | | Content text |
| Button | 0.875rem | Bold (700) | Uppercase, tracking-wide | Action labels |
| Badge | 0.75rem | Bold (700) | Uppercase, tracking-wider | Status labels |
| Caption | 0.875rem | Medium (500) | | Labels, hints |

## Shape Language (Neobrutalist)

| Property | Value | CSS |
|----------|-------|-----|
| Border radius | 6px | `border-radius: var(--neo-radius)` / `rounded-md` |
| Border width | 2px solid | `border: 2px solid var(--border-color)` |
| Card shadow | 4px 4px 0 (no blur) | `box-shadow: var(--neo-shadow)` |
| Card hover shadow | 6px 6px 0 | `box-shadow: var(--neo-shadow-hover)` |
| Button shadow | 3px 3px 0 | `box-shadow: var(--neo-shadow-sm)` |
| Hover effect | translate(-2px, -2px) | Lift up-left + bigger shadow |
| Press effect | translate(0, 0) | Push flat + no shadow |

### Utility Classes

| Class | Usage |
|-------|-------|
| `.neo-card` | Card with border + shadow + hover lift |
| `.neo-btn` | Button with border + shadow + uppercase |
| `.neo-input` | Input with border + focus shadow |
| `.card` | Base card (automatically neobrutalist) |
| `.btn` | Base button (automatically neobrutalist) |

## Chorbie Mascot

The Chorbie star mascot appears in two contexts:

1. **Logo icon** (`kc-icon.svg`): Static SVG for branding — rounded 5-pointed star with face, gradient, checkmark sparkle
2. **In-app mascot** (`Chorbie.tsx`): Animated React component with expressions (happy, excited, thinking, celebrating) — used for feedback and engagement

### Guidelines

- Use the **Logo icon** for external branding (favicons, social, print)
- Use the **animated Chorbie** for in-app interactions
- Never mix the two (don't animate the logo, don't use static Chorbie in branding)

## Favicon & PWA

| File | Size | Usage |
|------|------|-------|
| `favicon.svg` | Vector | Modern browsers |
| `favicon.ico` | 32x32 | Legacy browsers |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `icon-192.png` | 192x192 | Android PWA |
| `icon-512.png` | 512x512 | PWA splash |

### Theme Color

- Light: `#58CC02` (Feather Green)
- Dark: `#0A0A0F` (OLED Black)

## File Locations

| Asset Type | Path |
|------------|------|
| SVG masters | `logos/kidschores/svg/` |
| PNG exports | `logos/kidschores/png/` |
| Favicons | `logos/kidschores/favicon/` |
| Dashboard icons | `logos/kidschores/dashboard/` |
| App public assets | `kidschores-app/frontend/public/` |
| Logo component | `kidschores-app/frontend/src/components/Logo.tsx` |
| Pipeline scripts | `logos/tools/` |
