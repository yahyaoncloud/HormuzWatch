import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useLayoutEffect } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/providers';
import { useSettingsStore } from '@/stores';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (error instanceof Response && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mql.matches);
      root.classList.toggle('dark', isDark);
    };
    apply();
    if (theme === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [theme]);
}

export function Layout({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hw_theme")||(localStorage.getItem("hw_settings")?JSON.parse(localStorage.getItem("hw_settings")).theme:null);var isDark=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(isDark){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-fg)] font-ui antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <Providers>
        <Outlet />
        <Toaster position="bottom-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </Providers>
    </QueryClientProvider>
  );
}

export default function AppRoot() {
  return <AppProviders />;
}

export function HydrateFallback() {
  return <AppProviders />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  console.error('Route error:', error);

  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 mx-auto text-danger mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-labelledby="error-svg-title"
          >
            <title id="error-svg-title">Error alert icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="font-display text-display-md text-fg mb-2">Error {error.status}</h1>
          <p className="font-ui text-body text-fg-muted mb-6">{error.statusText}</p>
          <a
            href="/"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-ui font-medium hover:bg-primary/90 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="text-center max-w-md">
        <svg
          className="w-16 h-16 mx-auto text-danger mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-labelledby="unexpected-error-svg-title"
        >
          <title id="unexpected-error-svg-title">Unexpected error icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h1 className="font-display text-display-md text-fg mb-2">Something went wrong</h1>
        <p className="font-ui text-body text-fg-muted mb-6">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-ui font-medium hover:bg-primary/90 transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
