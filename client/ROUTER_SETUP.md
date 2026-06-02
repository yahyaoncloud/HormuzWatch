# PHASE 2 Client - React Router v7 Setup

## Overview

This is the PHASE 2 client application for Geospatial HormuzWatch, built with React 19 and React Router v7. The client provides real-time Geospatial telemetry visualization and threat intelligence dashboarding.

## Architecture

### Directory Structure

```
client/
├── src/
│   ├── main.tsx                 # Entry point with RouterProvider
│   ├── index.css               # Global styles and dark mode support
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # Error boundary for route errors
│   │   ├── LoadingSpinner.tsx  # Lazy loading fallback
│   │   └── HormuzMap.tsx       # Main map component
│   ├── hooks/
│   │   ├── index.ts            # Hook exports
│   │   └── useNavigation.ts    # Enhanced navigation hook
│   ├── layouts/
│   │   └── RootLayout.tsx      # Root layout with sticky nav
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Real-time telemetry view
│   │   ├── AnalyticsPage.tsx   # Historical analysis
│   │   ├── AlertsPage.tsx      # Live threat alerts
│   │   ├── HealthPage.tsx      # System health monitoring
│   │   ├── AuditPage.tsx       # Compliance logs
│   │   ├── InsightsPage.tsx    # AI threat analysis
│   │   └── DocsPage.tsx        # Documentation
│   ├── routes/
│   │   └── index.tsx           # Route configuration with error boundary
│   ├── context/
│   │   └── WebSocketContext.tsx # WebSocket provider for real-time data
│   └── types/
│       └── *.d.ts             # Type definitions
├── index.html                   # Root HTML with div#root
├── vite.config.ts              # Vite configuration with API proxy
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

## React Router v7 Features Used

### 1. **Route Configuration**

```typescript
// client/src/routes/index.tsx
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <LazyPageWrapper><DashboardPage /></LazyPageWrapper>,
        handle: {
          title: "Dashboard",
          description: "Real-time Geospatial telemetry",
        },
      },
      // ... more routes
    ],
  },
];
```

Features:

- Nested route structure with `RootLayout` as parent
- Error boundary per route
- Lazy-loaded page components with `Suspense`
- Route metadata via `handle` property

### 2. **Code Splitting & Lazy Loading**

All page components are lazy-loaded using React's `lazy()`:

```typescript
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
```

Fallback component:

```typescript
<Suspense fallback={<LoadingSpinner />}>
  {children}
</Suspense>
```

Benefits:

- Smaller initial bundle size
- Faster page loads
- Automatic code splitting

### 3. **Error Boundary**

Custom error boundary handles route errors gracefully:

```typescript
// client/src/components/ErrorBoundary.tsx
export default function ErrorBoundary() {
  const error = useRouteError();
  // Handle route errors with user-friendly UI
}
```

### 4. **Navigation Hook**

Enhanced custom hook for navigation patterns:

```typescript
// client/src/hooks/useNavigation.ts
export const useNavigation = () => {
  // Convenient navigation methods
  return {
    goTo: (path: string) => navigate(path),
    goBack: () => navigate(-1),
    refresh: () => navigate(location.pathname, { replace: true }),
    isRoute: (path: string) => location.pathname === path,
    // ... more utilities
  };
};
```

### 5. **Active Link Detection**

RootLayout uses `useLocation()` to detect active routes:

```typescript
// client/src/layouts/RootLayout.tsx
const location = useLocation();
const isActive = location.pathname === path;

// Apply active styles
<NavLink to={path} isActive={isActive} />
```

## Key Components

### main.tsx (Entry Point)

```typescript
const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    // ... other future flags
  },
});

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
```

### RootLayout

- Sticky navigation with 7 main routes
- Dark/light mode toggle
- Active link highlighting
- Responsive design with Tailwind CSS

### Error Boundary

Handles:

- 404 Not Found
- Route errors
- Runtime errors
- Displays user-friendly error UI

## Development

### Setup

```bash
cd client
npm install
npm run dev
```

Vite will start on `http://localhost:5173` with API proxy to backend.

### Build

```bash
npm run build
npm run preview  # Test production build
```

### Type Checking

```bash
npm run type-check
```

## PHASE 2 Routing Map

| Route        | Component     | Purpose                           |
| ------------ | ------------- | --------------------------------- |
| `/`          | DashboardPage | Real-time telemetry visualization |
| `/dashboard` | DashboardPage | Main dashboard                    |
| `/analytics` | AnalyticsPage | Historical analysis & metrics     |
| `/alerts`    | AlertsPage    | Live threat alerts & anomalies    |
| `/health`    | HealthPage    | System health monitoring          |
| `/audit`     | AuditPage     | Compliance audit logs             |
| `/insights`  | InsightsPage  | AI-driven threat analysis         |
| `/docs`      | DocsPage      | API documentation                 |
| `*`          | ErrorBoundary | 404 Not Found                     |

## Environment Variables

Configure API endpoint via environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:8080
```

Or use default: `http://localhost:8080`

## Vite Configuration

### Key Features

```typescript
// vite.config.ts
- Port: 5173
- API Proxy: /api → backend (configurable)
- Code splitting: vendor + page chunks
- Source maps enabled in dev
- Terser minification in production
```

### API Proxy

All requests to `/api/*` are proxied to the backend:

```typescript
proxy: {
  "/api": {
    target: process.env.VITE_API_URL || "http://localhost:8080",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
}
```

## Future Enhancements

### For PHASE 3+

- [ ] Route guards (authentication)
- [ ] Route-based data fetching with loaders
- [ ] Prefetching strategies
- [ ] Progressive enhancement
- [ ] Search params management
- [ ] Form actions
- [ ] Multi-step workflows

### Recommended Additions

- Protected routes wrapper
- Global loading state
- Query parameter management
- Route animation transitions
- Persistent navigation state

## Dependencies

### Core

- `react@19.2.6` - UI library
- `react-dom@19.2.6` - DOM rendering
- `react-router-dom@7.0.0` - Routing

### Data Visualization

- `leaflet@1.9.4` - Mapping library
- `leaflet.heat@0.2.0` - Heat map
- `leaflet.markercluster@1.5.3` - Marker clustering
- `recharts@3.8.1` - Charts

### Styling

- `tailwindcss@4.3.0` - Utility CSS
- `lucide-react@1.17.0` - Icons

### Development

- `typescript@5.6.2` - Type safety
- `vite@8.0.12` - Build tool
- `@vitejs/plugin-react@6.0.2` - React plugin

## Best Practices

1. **Lazy Load Pages** - All page routes use lazy loading
2. **Error Boundaries** - Each route has error handling
3. **Active Links** - Navigation shows current location
4. **Dark Mode** - Persistent theme preference
5. **Type Safety** - Full TypeScript coverage
6. **Code Splitting** - Vendor + page chunks
7. **API Proxy** - Centralized backend communication

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 5174
```

### API Proxy Not Working

1. Check `VITE_API_URL` environment variable
2. Ensure backend is running on target port
3. Check CORS headers from backend

### Types Not Found

```bash
npm run type-check  # Verify TypeScript
npm install         # Reinstall dependencies
```

## Resources

- [React Router v7 Docs](https://reactrouter.com)
- [React 19 Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
