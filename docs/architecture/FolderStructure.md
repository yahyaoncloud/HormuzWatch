# Enterprise Folder Structure Conventions

```
client-v2/
├── react-router.config.ts      # React Router v8 configuration
├── vite.config.ts              # Vite plugins (@react-router/dev, tailwindcss)
├── tsconfig.json               # TypeScript path alias configuration
├── index.html                  # HTML entry point pointing to entry.client.tsx
│
├── src/
│   ├── app/                    # React Router v8 Framework Core
│   │   ├── entry.client.tsx    # Hydration entry
│   │   ├── entry.server.tsx    # SSR entry
│   │   ├── root.tsx            # HTML Root Shell & Provider Tree
│   │   ├── routes.ts           # Route Manifest
│   │   └── routes/             # Route Modules
│   │       ├── home.tsx
│   │       ├── login.tsx
│   │       ├── register.tsx
│   │       ├── dashboard.tsx
│   │       ├── about.tsx
│   │       ├── intelligence/
│   │       ├── learn/
│   │       ├── api/
│   │       ├── research/
│   │       └── deploy/
│   │
│   ├── components/             # Reusable UI & Feature Components
│   │   ├── ui/                 # Atomic UI primitives
│   │   ├── layout/             # Layout Shells (RootLayout, LearnLayout)
│   │   ├── maps/               # MapLibre / Leaflet components
│   │   └── intelligence/       # Threat panels, Stat strips
│   │
│   ├── lib/                    # API Clients & Real-time Engines
│   │   ├── api.ts              # REST API Client
│   │   └── supabase.ts         # Supabase Client
│   │
│   ├── providers.tsx           # Context Providers (WebSocket, Map, Time, Theme)
│   ├── stores/                 # Zustand Stores (Auth, Settings, Intelligence)
│   ├── styles/                 # Global CSS & Tailwind Theme configuration
│   └── types/                  # Shared TypeScript interfaces
```
