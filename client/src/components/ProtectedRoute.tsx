import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "../context/AuthContext";
import { isPrimaryAdmin } from "../config/auth";
import LoadingSpinner from "./LoadingSpinner";

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactElement; adminOnly?: boolean }) {
  const { isAuthenticated, isSessionLoading, user } = useAuth();

  if (isSessionLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isPrimaryAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
