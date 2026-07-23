# Authentication & Role-Based Authorization Architecture

## Authentication Pipeline
Authentication is executed at the route boundary before layout or component instantiation.

```
[Request] -> [Route Loader] -> [getSession / JWT Check] -> [RBAC Check] -> [Component Render]
                                           |                     |
                                           v (Invalid)           v (Unauthorized)
                                    [Redirect to /login]  [Throw 403 Forbidden]
```

## Security Rules
1. **No Client Render-Body Authorization**: Components do not trigger `navigate('/login')` inside render functions.
2. **Session Persistence**: JWT tokens persist in `localStorage` (`auth_token`) and are validated against `/auth/session` during route loading.
3. **Demo Admin Mode**: Controlled via `hw_demo_admin` flag or `VITE_ENABLE_DEMO_BYPASS` environment variable for sandbox demonstration.
