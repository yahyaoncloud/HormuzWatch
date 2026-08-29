# 🌐 HormuzWatch Frontend Client (`client/`)

The HormuzWatch frontend is a responsive Single-Page Application (SPA) built with React 19, React Router v7, Tailwind CSS, MapLibre GL, and Leaflet.

---

## 📁 Project Structure

```
client/
├── src/
│   ├── app/
│   │   ├── routes/             # File-based SPA routes (public, admin, auth, docs)
│   │   │   ├── public/         # Public live map, intelligence dashboard, feed
│   │   │   └── admin/          # Admin tracking, anomaly review, event audit
│   │   └── root.tsx            # Global layout, theme provider, and toasts
│   ├── components/
│   │   ├── maps/               # MapLibre GL & Leaflet geospatial visualizers
│   │   ├── intelligence/       # Threat assessment, metrics grid, PDF report modal
│   │   ├── home/               # Navigation topbar, telemetry panels, tabs
│   │   └── ui/                 # Accessible Radix / Tailwind UI primitives
│   ├── lib/
│   │   ├── api.ts              # Fetch client for Go REST API
│   │   └── websocket.ts        # Resilient auto-reconnecting WebSocket client
│   └── stores/                 # Zustand state stores (UI, telemetry, map filters)
├── nginx.conf                  # Production reverse proxy config for Docker
├── vercel.json                 # Vercel SPA routing configuration
├── react-router.config.ts      # React Router 7 SPA configuration
└── vite.config.ts              # Vite build, asset chunking & alias definitions
```

---

## 🚀 Key Features

1. **High-Performance Geospatial Rendering**:
   - Hardware-accelerated MapLibre GL vector tiles with custom dark marine styling.
   - Dynamic track rendering with heading vectors, speed interpolations, and land-clipping prevention.
2. **Real-time Live Telemetry**:
   - Auto-reconnecting WebSocket stream with zero-drop client-side message queue.
   - Live AIS vessel and ADS-B aircraft markers color-coded by threat classification.
3. **Automated Intelligence Dossiers**:
   - Single-click PDF intelligence report generation downloaded directly from the Go LaTeX pipeline.
4. **Resilient Offline Fallback**:
   - Progressive hydration with graceful fallback when backend feeds are unavailable.

---

## 🛠️ Development & Deployment

### 1. Local Development
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start Vite dev server with hot module replacement (HMR)
npm run dev
```

### 2. Production Build
```bash
# Compile TypeScript and build static SPA assets to build/client
npm run build

# Preview production build locally
npm run preview
```

### 3. Vercel Deployment
The client is automatically deployed to [hormuzwatch.vercel.app](https://hormuzwatch.vercel.app) via `.github/workflows/client-pipeline.yml` using `vercel.json` rewrites.
