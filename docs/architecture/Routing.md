# React Router v8 Framework Mode Routing Architecture

## Router Configuration & Mode
The application utilizes **React Router v8 Framework Mode** configured in `react-router.config.ts` and enabled via `@react-router/dev/vite`.

- **Client Entry**: `src/app/entry.client.tsx` using `HydratedRouter` and `hydrateRoot`/`createRoot`.
- **HTML Root**: `src/app/root.tsx` serving document shell, global styles (`globals.css`), query provider, and theme manager.
- **Route Manifest**: `src/app/routes.ts` defining route layout trees.

## Route Module Conventions

Every route module inside `src/app/routes/` adheres to standard Framework exports:

```tsx
import type { Route } from './+types/my-route';

// 1. Route Loader: Runs before component rendering
export async function loader({ request, params }: Route.LoaderArgs) {
  const data = await fetchSomeData();
  return { data };
}

// 2. Route Action: Handles form submissions and data mutations
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  return { success: true };
}

// 3. Default Component Export
export default function MyRoute({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.data}</div>;
}

// 4. Isolated Error Boundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div className="text-danger">Route Error Encountered</div>;
}
```

## Nested Layout Hierarchy
1. `RootLayout`: Wraps header navigation, main content outlet, and site footer.
2. `LearnLayout`: Wraps table of contents and documentation pages.
3. `DashboardLayout`: Wraps admin navigation and dataset management views.
