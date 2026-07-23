# HormuzWatch Client (`client-v2`)

> The next-generation interactive intelligence portal and documentation platform for the HormuzWatch platform.

---

## 🚀 Tech Stack

- **Framework**: React 19 + React Router v7 (Framework Mode)
- **Build Tool**: Vite 6 + `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (CSS-first, `@theme` token design system, `:root.dark` overrides)
- **Maps**:
  - `LeafletMap`: Full-bleed centerpiece map with light/dark CartoDB & Esri tiles.
  - `EditorialMap` & `RegionalMap`: MapLibre GL 2D/3D map for regional intelligence, hotzones, and vector layers.
- **Charts**: uPlot for high-performance zero-latency telemetry and model comparison rendering.
- **State Management**: Zustand stores (`useAuthStore`, `useSettingsStore`) + TanStack Query (v5).
- **Code Quality**: Biome formatter & linter.

---

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📡 Key Features

1. **Interactive Home Console**: Full-bleed live map with real-time AIS/ADS-B tracks, quick timeline filters, severity toggles, and live stat strips.
2. **Regional Intelligence**: Dedicated interactive intelligence maps for the Strait of Hormuz, Persian Gulf, Gulf of Oman, Red Sea, and Bab-el-Mandeb.
3. **Living Documentation**: Technical whitepapers with live interactive charts, math formulas, architecture breakdowns, and live data stream mode toggles.
4. **Admin Dashboard (`/dashboard`)**: Single-admin console for user approvals, platform settings, dataset snapshotting, and server configuration.
