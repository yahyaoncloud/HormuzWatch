import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Outlet } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBoundary from "../components/ErrorBoundary";
import AboutPage from "../pages/AboutPage";
import NewsPage from "../pages/NewsPage";
import { AuthProvider } from "../context/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import DisclaimerBanner from "../components/DisclaimerBanner";

// Lazy load page components for better code splitting
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage"));
const InsightsPage = lazy(() => import("../pages/InsightsPage"));
const DocsPage = lazy(() => import("../pages/DocsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const TrackDetailsPage = lazy(() => import("../pages/TrackDetailsPage"));
const PublicLandingPage = lazy(() => import("../pages/PublicLandingPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const AdminPage = lazy(() => import("../pages/AdminPage"));
const PublicLivePage = lazy(() => import("../pages/PublicLivePage"));

// Lazy load fallback for async route loading
const LazyPageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <AuthProvider>
        <DisclaimerBanner />
        <Outlet />
      </AuthProvider>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      // Public Landing Page - Default/Index
      {
        index: true,
        element: (
          <LazyPageWrapper>
            <PublicLandingPage />
          </LazyPageWrapper>
        ),
      },

      // Auth Routes
      {
        path: "login",
        element: (
          <LazyPageWrapper>
            <LoginPage />
          </LazyPageWrapper>
        ),
      },
      {
        path: "register",
        element: (
          <LazyPageWrapper>
            <RegisterPage />
          </LazyPageWrapper>
        ),
      },
      {
        path: "live",
        element: (
          <LazyPageWrapper>
            <PublicLivePage />
          </LazyPageWrapper>
        ),
        handle: {
          title: "Live Maritime Feed",
          description: "Real-time top 10 anomalous vessel traces",
        },
      },

      // Public App Routes (Wrapped in RootLayout with Sidebar)
      {
        element: <RootLayout />,
        children: [
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

      // Protected App Routes (Wrapped in RootLayout with Sidebar)
      {
        element: (
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "dashboard",
            element: (
              <LazyPageWrapper>
                <DashboardPage />
              </LazyPageWrapper>
            ),
            handle: {
              title: "Dashboard",
              description:
                "Real-time Geospatial telemetry and threat monitoring",
            },
          },
          {
            path: "about",
            element: (
              <LazyPageWrapper>
                <AboutPage />
              </LazyPageWrapper>
            ),
            handle: {
              title: "About",
              description: "About HormuzWatch",
            },
          },
          {
            path: "news",
            element: (
              <LazyPageWrapper>
                <NewsPage />
              </LazyPageWrapper>
            ),
            handle: {
              title: "News",
              description: "News related to HormuzWatch",
            },
          },
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
          {
            path: "analytics/track/:id",
            element: (
              <LazyPageWrapper>
                <TrackDetailsPage />
              </LazyPageWrapper>
            ),
            handle: {
              title: "Track Details",
              description: "Historical details and anomaly analysis",
            },
          },
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

          {
            path: "settings",
            element: (
              <LazyPageWrapper>
                <SettingsPage />
              </LazyPageWrapper>
            ),
            handle: {
              title: "Settings",
              description: "System configuration and data retention",
            },
          },
          {
            path: "admin",
            element: (
              <ProtectedRoute adminOnly>
                <LazyPageWrapper>
                  <AdminPage />
                </LazyPageWrapper>
              </ProtectedRoute>
            ),
            handle: {
              title: "Admin Approvals",
              description: "Manage operator access requests",
            },
          },
        ],
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
