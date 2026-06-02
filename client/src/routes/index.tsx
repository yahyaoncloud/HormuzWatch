import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBoundary from "../components/ErrorBoundary";

// Lazy load page components for better code splitting
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage"));
const InsightsPage = lazy(() => import("../pages/InsightsPage"));
const DocsPage = lazy(() => import("../pages/DocsPage"));

// Lazy load fallback for async route loading
const LazyPageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

/**
 * PHASE 2 Route Configuration for React Router v7
 *
 * Structure:
 * - Root layout with navigation
 * - Dashboard: Real-time telemetry visualization
 * - Analytics: PHASE 2 data analysis and metrics
 * - Alerts: Live threat intelligence and anomalies
 * - Health: System health monitoring
 * - Audit: Audit logs and compliance
 * - Insights: AI-driven threat analysis
 * - Docs: API and system documentation
 * - Error boundary for graceful error handling
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Dashboard Route - Default/Index
      {
        index: true,
        element: (
          <LazyPageWrapper>
            <DashboardPage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Dashboard",
          description: "Real-time Geospatial telemetry and threat monitoring",
        },
      },

      // Dashboard explicit path
      {
        path: "dashboard",
        element: (
          <LazyPageWrapper>
            <DashboardPage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Dashboard",
          description: "Real-time Geospatial telemetry and threat monitoring",
        },
      },

      // Analytics Route - PHASE 2 Analysis
      {
        path: "analytics",
        element: (
          <LazyPageWrapper>
            <AnalyticsPage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Analytics",
          description:
            "Historical data analysis, metrics, and trend visualization",
        },
      },


      // Insights Route - AI Analysis
      {
        path: "insights",
        element: (
          <LazyPageWrapper>
            <InsightsPage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Insights",
          description: "AI-driven threat analysis and recommendations",
        },
      },

      // Documentation Route
      {
        path: "docs",
        element: (
          <LazyPageWrapper>
            <DocsPage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Documentation",
          description: "API reference and system documentation",
        },
      },
    ],
  },

  // Catch-all 404 route
  {
    path: "*",
    element: <ErrorBoundary />,
  },
];

export default routes;
