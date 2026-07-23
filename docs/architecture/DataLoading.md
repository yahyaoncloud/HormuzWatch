# Data Loading & Mutation Strategy

## Loader & Action Directives
1. **Zero `useEffect` Data Fetching**: No page components fetch data during rendering. All initial data requirements are declared in route `loader` functions.
2. **Standardized Mutations (`action`)**: State changes occur through route actions using `<Form>` or `useFetcher()`.
3. **Automatic Revalidation**: Upon successful execution of a route action, React Router v8 automatically revalidates active route loaders, rendering fresh UI without manual cache invalidation code.

## REST API Client Architecture
Located in `src/lib/api.ts`, the fetch client enforces:
- Automatic Authorization header injection (`Bearer <token>`).
- Request tracing with `X-Correlation-ID` and `X-Trace-ID` headers.
- Standardized error response handling throwing typed HTTP response objects.
