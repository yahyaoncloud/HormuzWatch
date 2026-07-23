# HormuzWatch — Tactical Icon System Architecture

A production-grade, vector tactical visualization icon library built specifically for real-time air and maritime intelligence platforms. Designed to render thousands of live objects at 60 FPS across Leaflet, MapLibre GL, and OpenLayers.

---

## Folder Structure

```
client-v2/src/icons/
├── tokens.css               # CSS custom properties (severity, affiliations, status tokens)
├── registry.ts              # Type-safe registry mapping icon IDs to metadata & renderers
├── leaflet.ts               # Leaflet DivIcon factory (heading rotation, selection, overlays)
├── index.ts                 # Main barrel export
├── aircraft/
│   └── index.ts             # 20 tactical aircraft top-down silhouettes
├── maritime/
│   └── index.ts             # 27 tactical maritime vessel hull silhouettes
├── infrastructure/
│   └── index.ts             # 45 static teardrop pin generators
├── overlays/
│   └── index.ts             # 35 status frame overlays (Selected, SOS, EW, Lost signal)
├── motion/
│   └── index.ts             # 12 vector motion indicators (heading line, orbit, loiter)
└── clusters/
    └── index.ts             # 9 scalable cluster marker generators
```

---

## Icon Categories & Behaviors

| Category | Behavior | Heading Rotatability | Size Range | Description |
|---|---|---|---|---|
| `aircraft` | `rotating-symbol` | **Yes** (000°..359°) | 16px - 48px | Top-down vector silhouettes centered on coordinates |
| `maritime` | `rotating-symbol` | **Yes** (000°..359°) | 16px - 48px | Top-down hull profiles centered on coordinates |
| `infrastructure` | `pin` | **No** (Static) | 24px - 36px | Teardrop pin base with inner category glyph |
| `overlay` | `overlay` | **No** (Static frame) | 36px - 48px | Composited state overlay surrounding contact |
| `motion` | `animated` | **Yes** | Dynamic | Vector lines for heading, speed vector, orbit |
| `cluster` | `cluster` | **No** | 30px - 44px | Aggregated density count badge with blur effect |

---

## Basic Usage

### 1. Generating a Leaflet DivIcon for Live Tracks
```typescript
import { createTacticalLeafletIcon } from '@/icons';

const icon = createTacticalLeafletIcon({
  iconId: 'vessel-oil-tanker', // or 'aircraft-fighter'
  severity: 'critical',
  heading: 145,
  selected: true,
});

L.marker([26.06, 56.28], { icon }).addTo(map);
```

### 2. Rendering Raw SVG Strings
```typescript
import { iconAircraftFighter, pinMilitaryAirbase } from '@/icons';

// Raw SVG string for custom canvas or MapLibre image source
const svgStr = iconAircraftFighter({ size: 24, color: '#ef4444' });
```

### 3. Reading Registry Metadata
```typescript
import { TACTICAL_ICON_REGISTRY } from '@/icons';

const meta = TACTICAL_ICON_REGISTRY['pin-military-airbase'];
console.log(meta.name, meta.minZoom); // "Military Airbase", 4
```

---

## Design & Performance Standards

1. **Pure Geometry**: 24x24 universal viewBox, optimized SVG paths without arbitrary pixel noise.
2. **Zero Gradients/Shadows**: No blur filters or heavy CSS filters inside SVGs to preserve 60 FPS performance when rendering 10,000+ contacts.
3. **CSS Variables Only**: Uses `currentColor` and CSS variables (`var(--severity-critical)`), supporting instant Light & Tactical Dark Mode switches without re-rendering DOM nodes.
