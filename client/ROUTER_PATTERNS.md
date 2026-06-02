# React Router v7 Patterns for PHASE 2

Quick reference guide for common React Router v7 patterns used in Geospatial HormuzWatch PHASE 2 client.

## Navigation

### Using the Custom Hook

```typescript
import { useNavigation } from "@/hooks";

export function MyComponent() {
  const { goTo, goBack, isRoute, pathname } = useNavigation();

  return (
    <>
      <button onClick={() => goTo("/alerts")}>View Alerts</button>
      <button onClick={goBack}>Back</button>
      {isRoute("/dashboard") && <p>You are on dashboard</p>}
    </>
  );
}
```

### Using React Router Hooks Directly

```typescript
import { useNavigate, useLocation, useParams } from "react-router-dom";

export function MyComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Navigate with state
  navigate("/alerts", { state: { from: location.pathname } });
}
```

## Routing

### Basic Route

```typescript
{
  path: "dashboard",
  element: <Dashboard />,
  handle: {
    title: "Dashboard",
    description: "Main dashboard",
  },
}
```

### Lazy-Loaded Route

```typescript
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("../pages/DashboardPage"));

{
  path: "dashboard",
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  ),
}
```

### Error Boundary

```typescript
import { useRouteError } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();
  // Handle error
}

// In route config
{
  path: "/",
  element: <RootLayout />,
  errorElement: <ErrorBoundary />,
  children: [/* ... */]
}
```

## Active Navigation

### Check Current Route

```typescript
import { useLocation } from "react-router-dom";

const location = useLocation();
const isActive = location.pathname === "/dashboard";
```

### NavLink with Active Styling

```typescript
import { Link, useLocation } from "react-router-dom";

function NavLink({ to, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={isActive ? "active" : ""}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
```

## Query Parameters

```typescript
import { useSearchParams } from "react-router-dom";

export function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const severity = searchParams.get("severity") || "all";
  const vessel = searchParams.get("vessel");

  const handleFilter = (newSeverity) => {
    setSearchParams({ severity: newSeverity });
  };

  return (
    <>
      <select onChange={(e) => handleFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="critical">Critical</option>
      </select>
    </>
  );
}
```

## Nested Routes & Outlets

```typescript
// Root layout with Outlet
import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div>
      <Navigation />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
}

// Route config
{
  path: "/",
  element: <RootLayout />,
  children: [
    { index: true, element: <Dashboard /> },
    { path: "dashboard", element: <Dashboard /> },
    { path: "alerts", element: <Alerts /> },
  ]
}
```

## Data Loading with Loaders (Future)

```typescript
// Loader function
async function dashboardLoader() {
  const response = await fetch("/api/dashboard/data");
  return response.json();
}

// Route config
{
  path: "dashboard",
  element: <Dashboard />,
  loader: dashboardLoader,
}

// Component
import { useLoaderData } from "react-router-dom";

export function Dashboard() {
  const data = useLoaderData();
  return <div>{/* Use data */}</div>;
}
```

## Protected Routes (Recommended Future Addition)

```typescript
function ProtectedRoute({ element }) {
  const isAuthenticated = !!localStorage.getItem("auth_token");

  return isAuthenticated ? element : <Navigate to="/login" />;
}

// Usage in routes
{
  path: "audit",
  element: <ProtectedRoute element={<AuditPage />} />,
}
```

## Prefetching (Optimization)

```typescript
import { Link } from "react-router-dom";

// React Router v7 automatically prefetches on hover/focus
<Link to="/alerts" prefetch="intent">
  View Alerts
</Link>
```

## Route Metadata

```typescript
// Define metadata in route handle
{
  path: "dashboard",
  element: <Dashboard />,
  handle: {
    title: "Dashboard",
    description: "Real-time telemetry",
    icon: "dashboard",
    requiresAuth: false,
  }
}

// Access in component
import { useMatches } from "react-router-dom";

export function Header() {
  const matches = useMatches();
  const currentRoute = matches[matches.length - 1];
  const title = currentRoute.handle?.title;

  return <h1>{title}</h1>;
}
```

## Transitions & Loading States

```typescript
import { useNavigation } from "react-router-dom";

export function DashboardPage() {
  const navigation = useNavigation();

  return (
    <div>
      {navigation.state === "loading" && <LoadingBar />}
      {/* Content */}
    </div>
  );
}
```

## Common Patterns for PHASE 2

### 1. Real-time Data Updates

```typescript
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function DashboardPage() {
  const location = useLocation();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Initialize data fetching for current route
    const es = new EventSource("/api/stream");
    es.onmessage = (evt) => {
      setData(JSON.parse(evt.data));
    };

    return () => es.close();
  }, [location.pathname]);

  return <div>{/* Render data */}</div>;
}
```

### 2. Filtering with Query Params

```typescript
export function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    severity: searchParams.get("severity") || "all",
    status: searchParams.get("status") || "active",
    vessel: searchParams.get("vessel") || "",
  };

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(key, value);
    setSearchParams(newParams);
  };

  return (
    <>
      <FilterBar filters={filters} onChange={handleFilterChange} />
      <AlertsList filters={filters} />
    </>
  );
}
```

### 3. Route-Based Initialization

```typescript
export function AnalyticsPage() {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState(() => {
    // Restore from query params
    const params = new URLSearchParams(location.search);
    return params.get("range") || "24h";
  });

  return <div>{/* Analytics */}</div>;
}
```

## Resources

- [React Router v7 Official Docs](https://reactrouter.com/start/overview)
- [useNavigation in PHASE 2](../src/hooks/useNavigation.ts)
- [Route Configuration](../src/routes/index.tsx)
- [RootLayout with Active Links](../src/layouts/RootLayout.tsx)
