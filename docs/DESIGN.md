# HormuzWatch Design System

> Enterprise intelligence platform — Akime · Linear · Raycast · Bloomberg · Palantir · Vercel  
> Last updated: 2026-07-24

---

## 1. Philosophy

**Documentation-first, flat enterprise.** The interface is a reader, not a control room. Every pixel of whitespace, every border, every animation exists to serve the narrative — not to simulate an operations center.

- **Flat.** No floating cards. No neumorphism. No oversized shadows.
- **Dense.** Compressed, professional. Reduce spacing by 30–40% from typical web defaults.
- **Connected.** Every component shares identical spacing, radius, border, and typography tokens. No exceptions.
- **Fast.** Animations are 120–180ms. Opacity + translate only. No bounce, no scale.
- **Accessible.** Desktop-first. Tablet optimized. Mobile preserved. Never sacrifice information density on desktop.

---

## 2. Color Palette

All colors use CSS custom properties (`var(--color-*)`). No hardcoded hex values in components (except map markers).

### Surface

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-bg` | `#FAFBFC` | `#0A0B0E` | Page background |
| `--color-bg-elevated` | `#F0F2F5` | `#13161B` | Sidebar, navbar backdrop |
| `--color-bg-card` | `#FFFFFF` | `#1A1D22` | Card/panel surface |
| `--color-bg-input` | `#FFFFFF` | `#1A1D22` | Input background |
| `--color-bg-hover` | — | — | Hover state |

### Foreground

| Token | Usage |
|---|---|
| `--color-fg` | Primary text |
| `--color-fg-muted` | Secondary labels, metadata |
| `--color-fg-subtle` | Disabled text, placeholder |
| `--color-fg-link` | Link color (uses primary) |

### Border

| Token | Usage |
|---|---|
| `--color-border` | Standard 1px border on all components |

### Brand

| Token | Usage |
|---|---|
| `--color-primary-50` through `--color-primary-900` | Full primary palette (scale) |
| `--color-primary-600` | Default primary fill, buttons |
| `--color-primary-700` | Hover darken |

### Status

| Token | Usage |
|---|---|
| `--color-success` / `--color-success-muted` / `--color-success-border` | Green — nominal, clean |
| `--color-warning` / `--color-warning-muted` / `--color-warning-border` | Amber — medium risk |
| `--color-danger` / `--color-danger-muted` / `--color-danger-border` | Red — critical, immediate |
| `--color-info` / `--color-info-muted` / `--color-info-border` | Blue — informational |

**Rule:** Status colors are always muted. No saturated neon. Use `bg-{status}/10 text-{status}-400 border-{status}/30` for badges and chips.

---

## 3. Typography

| Token | Font | Usage |
|---|---|---|
| `font-display` | Fraunces (serif) | Headings, section titles |
| `font-ui` | Inter (sans-serif) | Body text, buttons, labels |
| `font-mono` / `font-data` | JetBrains Mono | Code, metrics, data, timestamps |

### Scale

| Class | Size | Usage |
|---|---|---|
| `text-[9px]` / `text-[10px]` | Caption | Badges, metadata, timestamps |
| `text-[11px]` / `text-[12px]` | Small | Labels, compact UI |
| `text-[13px]` | Body compact | Button text, list items |
| `text-sm` (~14px) | Body | Paragraphs, descriptions |
| `text-base` (~15px) | Headings | Card titles, section heads |
| `text-lg` (~18px) | Large | Page titles |
| `text-xl` / `text-display-*` | Display | Hero sections only |

**Rule:** Headings are 1-2 steps above body. No giant hero typography. Metadata is always 10-12px.

---

## 4. Spacing

Global reduction of ~35% from web defaults.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 0.25rem | Tight gaps, icon+label |
| `space-2` | 0.5rem | Inner padding (compact) |
| `space-3` | 0.75rem | Content padding, card padding |
| `space-4` | 1rem | Card padding, section gap (default) |
| `space-6` | 1.5rem | Section margin (legacy, being reduced) |
| `space-8` | 2rem | Page-level padding |

**Rules:**
- Card padding: `p-4` (1rem)
- Button padding-x: `px-3.5` (default), `px-3` (sm)
- List item vertical gap: `space-y-0.5` or `divide-y` with `py-1`
- Panel header padding: `px-3 py-2.5`
- No component should use `p-6` or larger (except hero sections)

---

## 5. Border Radius

| Class | Usage |
|---|---|
| `rounded-none` | Cards, panels, inputs, tables, modals, drawers |
| `rounded-md` | Buttons, sidebar items, nav links, badge containers |
| `rounded-sm` | Code blocks, compact elements |
| `rounded-full` | Severity dots (1.5px), status indicators only |

**Rule:** Everything is `rounded-none` by default. `rounded-md` on interactive elements (buttons, links). `rounded-full` ONLY on 1-4px indicator dots. No `rounded-lg`, `rounded-xl`, `rounded-2xl`, or `rounded-3xl` anywhere.

---

## 6. Borders & Shadows

| Approach | Usage |
|---|---|
| `border border-[var(--color-border)]` | Default component boundary |
| `border-b border-[var(--color-border)]` | List separators, panel footers |
| `border-l-2 border-l-[var(--color-danger)]` | Critical threat accent |
| `divide-y divide-[var(--color-border)]` | Dense lists (preferred over per-item cards) |

**Rule:** Use 1px borders. Never use `shadow-lg` or `shadow-xl`. Minimal `shadow-sm` only on overlays (modals, dropdowns, notification panel).

---

## 7. Animation

| Token | Value | Usage |
|---|---|---|
| `--anim-fast` | `120ms cubic-bezier(0,0,0.2,1)` | Hover transitions, focus rings |
| `--anim-normal` | `150ms cubic-bezier(0,0,0.2,1)` | Panel expand, tab switches |
| `--anim-slow` | `180ms cubic-bezier(0,0,0.2,1)` | Drawer/overlay enter/exit |

**Rules:**
- Opacity + translate only. No scale transforms except resize handles.
- No bounce. No spring. No exaggerated easing.
- `transition-colors` on all interactive elements.
- `prefers-reduced-motion` respected globally.

---

## 8. Component Specifications

### 8.1 Buttons

```
Default: h-9 (36px), px-3.5, text-[13px], rounded-md, font-medium
Small:   h-8 (32px), px-3, text-xs
Large:   h-10 (40px), px-5, text-sm
Icon:    h-8 w-8 (32px)
```

| Variant | Style |
|---|---|
| `default` | `bg-primary-600` fill, white text, no border |
| `outline` | Transparent bg, `border-[var(--color-border)]`, fg text |
| `ghost` | Transparent, muted text, hover bg-elevated |
| `secondary` | `bg-elevated`, fg text, border |
| `link` | Primary color, underline on hover |

**Rule:** Buttons never have `rounded-xl` or `rounded-full`. Focus ring: `ring-1.5 ring-primary-600 ring-offset-1`.

### 8.2 Inputs

```
Height:    h-9 (36px)
Padding:   px-3
Font:      text-[13px]
Border:    1px border
Radius:    rounded-none
Focus:     border-primary-600, no glow
```

### 8.3 Cards / Panels

```
Padding:  p-4 (1rem)
Border:   1px border-border
Radius:   rounded-none
Bg:       bg-card
Shadow:   none
```

Card sub-components:
- `CardHeader`: `p-4 pb-2`, gap-1, title `text-sm font-semibold`
- `CardContent`: `p-4 pt-0`
- `CardFooter`: `p-4 pt-0`, flex gap-2

**Rule:** Never use `rounded-2xl` on cards. Never use floating shadows. Cards should appear connected to the layout.

### 8.4 Modals

```
Padding:  p-4
Radius:   rounded-none
Border:   1px border-border
Backdrop: bg-black/50 backdrop-blur-sm
Max-w:    md=32rem, lg=48rem, xl=64rem
```

Header: `pb-3 border-b border-border`, title `text-base font-semibold`.  
Close button: `p-1`, X icon 16px.

### 8.5 Navbar

```
Height:   h-12 (48px)
Padding:  px-4 sm:px-6
Position: sticky top-0 z-30
Bg:       bg-bg/90 backdrop-blur-sm
Border:   border-b border-border
```

Links: `px-2.5 py-1.5`, `text-[13px]`, `rounded-md`. Active: `bg-primary-50 text-primary-700`.  
Logo: icon 24px, text `text-lg font-semibold font-display`.  
Mobile dropdown: flat, no radius, `max-w-sm`.

### 8.6 Sidebar

```
Width:         w-60 (240px), collapsed: w-[52px]
Header:        h-12, px-3, border-b
Nav items:     rounded-md, px-2.5 py-1.5, text-[13px]
Icons:         h-4 w-4 (16px)
Active:        bg-primary-600 text-white
Collapse btn:  h-6 w-6, border, ChevronLeft/Right 14px
User footer:   p-2.5, border-t, avatar 28px
```

### 8.7 Tables

```
Row height:   h-10 (40px)
Cell padding: px-3 py-2
Font:         text-[13px] body, text-[11px] headers
Headers:      uppercase tracking-wider text-fg-muted font-semibold
Rows:         border-b border-border
Hover:        bg-bg-elevated
```

### 8.8 Tooltips

```
Font:     text-xs
Padding:  py-1.5 px-3
Radius:   rounded-sm
Gap:      space-1.5 (from trigger)
```

### 8.9 Toasts

```
Radius:    rounded-sm
Padding:   p-3
Gap:       gap-2 (stack)
Max-w:     22rem
Position:  fixed bottom-5 right-5 z-[9999]
Animation: slideUp/slideDown 150ms
```

Icon: 16px (CheckCircle2 / AlertCircle / Info). Title: `text-[10px] uppercase font-semibold`. Message: `text-sm`.

---

## 9. Layout Patterns

### 9.1 Page Container

```tsx
<PageContainer>
  {/* max-w-5xl, px-5 py-8 sm:px-8 sm:py-10 */}
  {/* Wide mode: max-w-7xl */}
</PageContainer>
```

### 9.2 Section

```tsx
<Section id="section-id" title="Title" subtitle="Description">
  {/* scroll-mt-16, py-6 md:py-8 */}
  {/* Heading: font-display, tracking-tight */}
  {/* Subtitle: text-fg-muted, max-w-3xl */}
  {/* Divider: h-px bg-gradient from-primary/30 to-transparent */}
</Section>
```

### 9.3 Three-Panel (Map Tab)

```
<Console w-[dynamic]> | <ResizeHandle 1px> | <Map flex-1> | <ResizeHandle 1px> | <Threats w-[dynamic]>
```

- Console: min 200px, max 400px, default 240px
- Threats: min 240px, max 500px, default 288px
- Resize handles: 1px `bg-border`, `col-resize` cursor, 100ms expand to 1.5px on hover
- No gap between panels (`gap-0`)

### 9.4 Two-Column (Intelligence Tab)

```
<Left 3/5> | <1px border-r> | <Right 2/5>
```

`gap-0`, with `pr-4 border-r` on left, `pl-4` on right.

### 9.5 Feed Tab

```
<Alerts 2/3> | <Strait + Transits 1/3>
```

Dense `divide-y` lists instead of per-item cards. Hover-to-reveal action buttons.

---

## 10. Icons

**Lucide only.** No custom icon packs. No emoji in UI.

| Size | Usage |
|---|---|
| `h-3 w-3` | Tiny: inline metadata, mini KPIs |
| `h-3.5 w-3.5` | Compact: buttons, nav items |
| `h-4 w-4` (16px) | Default: section headers, sidebar, panels |
| `h-5 w-5` | Large: hero, CTA (rare) |

---

## 11. Prose (Documentation)

The `<Prose>` component scopes all typography to theme tokens. Applied as a wrapper around any MD-style content section.

```tsx
import { Prose } from '@/components/ui/prose';

<Prose>
  <h2>Section Title</h2>
  <p>Body text...</p>
  <blockquote>Citation...</blockquote>
  <table>...</table>
  <pre><code>code block</code></pre>
</Prose>
```

**Embedded charts** use `ProseBarChart` (vertical SVG bars) and `ProseHorizontalBarChart` (CSS horizontal bars) inside `prose-chart` containers.

**Callouts:** `<div className="prose-callout info|warn|crit">` with tinted background and colored left border.

**Metric grids:** `<div className="prose-metric-row">` with `<div className="prose-metric">` children showing data values.

---

## 12. File Organization

```
src/
├── components/
│   ├── ui/           # Shared: button, card, modal, navbar, sidebar, prose, etc.
│   ├── layout/       # RootLayout, SiteFooter, PageContainer, Section, admin layouts
│   ├── intelligence/ # IntelligenceConsole, IntelligenceDashboard, ThreatsPanel
│   ├── maps/         # LeafletMap, EditorialMap, RegionalMap, MapContainer
│   ├── data/         # LiveStatStrip, MetricGrid, ModelChart, SparklineChart
│   └── docs/         # DocumentationBlock, APIExampleBlock, IncidentFeed, ResearchCard
├── app/routes/
│   ├── public/       # home, about, api, deploy, research, learn/, intelligence/
│   ├── admin/        # dashboard, analytics, sources, threats, tracking, etc.
│   └── auth/         # login, register
├── stores/           # Zustand: UIStore (toasts), NotificationStore, SettingsStore
├── providers/        # WebSocket context, query client
├── lib/              # API client, types
├── utils/            # cn() helper
└── styles/
    └── globals.css   # All design tokens (@theme), utilities, component presets
```

---

## 13. State Management

| Store | Purpose |
|---|---|
| `useUIStore` | Global toasts (`addToast`, `removeToast`). Persisted: none. |
| `useNotificationStore` | Push notifications (`addNotification`, `markRead`, `clearAll`, `togglePanel`). Persisted to localStorage. |
| `useSettingsStore` | User preferences (theme, motion, etc.). Persisted to localStorage. |

**Toast lifecycle:** Add → auto-remove after 5s (configurable `duration`). Types: `info`, `success`, `warning`, `error`.

**Notification lifecycle:** Push from data detection → stored in Zustand + localStorage → bell icon counter → click to open overlay panel → markRead/Clear all.

---

## 14. Dark Mode

Toggle via `class` strategy (`.dark` on `<html>`). All color tokens defined in `:root` and overridden in `:root.dark`.

```css
:root.dark {
  --color-bg: #0A0B0E;
  --color-bg-elevated: #13161B;
  --color-bg-card: #1A1D22;
  /* ... all surfaces, borders, fg, brand, status ... */
}
```

Every component must work in both modes using only `var(--color-*)` tokens.

---

## 15. Anti-Patterns (DO NOT USE)

- `rounded-2xl`, `rounded-3xl`, `rounded-xl` — use `rounded-none` or `rounded-md`
- `shadow-lg`, `shadow-xl`, `shadow-2xl` — use 1px borders
- `p-6`, `p-8`, `p-10` — use `p-3` or `p-4`
- `text-2xl`, `text-3xl`, `text-4xl` in components — use `text-base` or `text-lg`
- `gap-4`, `gap-6` — use `gap-1` or `gap-2` or `divide-y`
- `animate-bounce`, `animate-scale` — use `opacity` + `translate` only
- Hardcoded hex colors — use `var(--color-*)` tokens
- Floating cards with `glass-card` + shadow — use flat `border` panels
- Inline `<style>` blocks — use `<Prose>` or `globals.css` tokens
- Emoji in UI — use Lucide icons
