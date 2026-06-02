# PHASE 2 Client - Quick Start Guide

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on `http://localhost:8080` (configurable)

### Install Dependencies

```bash
cd client
npm install
```

### Environment Setup

Create `.env.local` file in the `client` directory (optional):

```env
VITE_API_URL=http://localhost:8080
VITE_LOG_LEVEL=debug
```

If not provided, the app will use default: `http://localhost:8080`

## Development

### Start Development Server

```bash
npm run dev
```

The app will open at: **http://localhost:5173**

Features:

- Hot Module Replacement (HMR) - Changes reflect instantly
- API proxy to backend (/api → configurable backend)
- Source maps for debugging

### What's Running

- **Frontend**: React 19 + React Router v7 at port 5173
- **Backend**: Expected at `http://localhost:8080`
- **API Proxy**: `/api/*` routes to backend

### Stop Server

Press `Ctrl+C` in the terminal

## Production Build

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production build:

- Minified JavaScript (Terser)
- Code splitting (vendor + pages)
- Source maps (for debugging)

### Preview Production Build

```bash
npm run preview
```

The build will be served at: **http://localhost:4173**

### Type Checking

Before committing, verify types:

```bash
npm run type-check
```

## Troubleshooting

### Issue: Port 5173 Already in Use

**Solution 1**: Kill existing process

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Solution 2**: Use different port

```bash
npm run dev -- --port 5174
```

### Issue: API Requests Failing (404/Connection Refused)

**Checklist**:

1. ✓ Backend running? Check `http://localhost:8080`
2. ✓ Correct `VITE_API_URL`? (Check `.env.local`)
3. ✓ CORS enabled on backend? (Should be with proxy)
4. ✓ Network accessible? (Not behind firewall)

**Debug**:

```bash
# Check if backend is running
curl http://localhost:8080/health

# Check proxy configuration
npm run dev  # Look for "Proxy" in output
```

### Issue: Changes Not Showing (HMR Not Working)

1. Clear browser cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Restart dev server: Stop and `npm run dev`

### Issue: TypeScript Errors

```bash
# Regenerate types
npm install

# Type check
npm run type-check

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Memory Running Out

For large projects, increase Node memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

## Project Structure

```
client/
├── src/
│   ├── main.tsx              ← Entry point (RouterProvider setup)
│   ├── index.css             ← Global styles
│   ├── components/           ← Reusable components
│   ├── hooks/                ← Custom React hooks
│   ├── layouts/              ← Page layouts (RootLayout with nav)
│   ├── pages/                ← Page components (lazy-loaded)
│   ├── routes/               ← Route configuration
│   ├── context/              ← React contexts
│   └── types/                ← TypeScript definitions
├── index.html                ← HTML entry point (div#root)
├── vite.config.ts            ← Vite build config
├── package.json              ← Dependencies
├── tsconfig.json             ← TypeScript config
├── ROUTER_SETUP.md           ← Router architecture guide
├── ROUTER_PATTERNS.md        ← Common React Router patterns
└── QUICK_START.md            ← This file
```

## PHASE 2 Routes

| Route               | Feature   | Purpose                      |
| ------------------- | --------- | ---------------------------- |
| `/` or `/dashboard` | Dashboard | Real-time Geospatial telemetry |
| `/analytics`        | Analytics | Historical data & trends     |
| `/alerts`           | Alerts    | Live threat alerts           |
| `/health`           | Health    | System monitoring            |
| `/audit`            | Audit     | Compliance logs              |
| `/insights`         | Insights  | AI threat analysis           |
| `/docs`             | Docs      | API documentation            |

Navigate using the sidebar or programmatically:

```typescript
import { useNavigation } from "@/hooks";

const { goTo } = useNavigation();
goTo("/alerts"); // Navigate to alerts
```

## Key Features

✅ **Real-Time Updates**

- WebSocket connection for live data
- Server-Sent Events (SSE) support
- Automatic reconnection

✅ **Dark Mode**

- Toggle in navigation bar
- Persists to localStorage
- Smooth transitions

✅ **Responsive Design**

- Mobile-friendly layouts
- Tailwind CSS utilities
- Adaptive navigation

✅ **Error Handling**

- Route error boundaries
- 404 Not Found page
- User-friendly error messages

✅ **Performance**

- Code splitting (pages as chunks)
- Lazy loading with Suspense
- Production minification

## Development Workflow

### 1. Make Changes

Edit files in `src/` - changes auto-reload in browser

### 2. Test Routes

- Navigate in app sidebar
- Or use dev tools: `location.pathname`

### 3. Build & Preview

```bash
npm run build
npm run preview  # Test production version
```

### 4. Type Check Before Commit

```bash
npm run type-check
```

## Docker Support

### Build Docker Image

```bash
docker build -t hormuzwatch-client:latest .
```

### Run Container

```bash
docker run -p 5173:5173 \
  -e VITE_API_URL=http://host.docker.internal:8080 \
  hormuzwatch-client:latest
```

## Performance Tips

1. **Keep Components Small** - Easier to lazy load
2. **Memoize Heavy Components** - Use `React.memo()`
3. **Optimize Images** - Use WebP format
4. **Monitor Bundle Size** - Check `npm run build` output

## Next Steps

- [ ] Review [ROUTER_SETUP.md](./ROUTER_SETUP.md) for architecture
- [ ] Check [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md) for code examples
- [ ] Read backend API docs
- [ ] Set up local `.env.local` if needed
- [ ] Start developing features for PHASE 2!

## Documentation

- **Architecture**: [ROUTER_SETUP.md](./ROUTER_SETUP.md)
- **Patterns**: [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md)
- **Backend API**: (Link to API docs)
- **PHASE 2 Goals**: [../docs/PHASE2.md](../docs/PHASE2.md)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review error messages in browser console
3. Check backend API status
4. Review code examples in ROUTER_PATTERNS.md

---

**Ready to develop?** Run `npm run dev` and start building! 🚀
