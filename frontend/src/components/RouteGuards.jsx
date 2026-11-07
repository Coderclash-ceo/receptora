import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * RequireAuthenticated:
 * - Unauthenticated -> /login
 * - Authenticated with NO businessId -> /setup
 * - Authenticated with businessId -> child routes (Dashboard, etc.)
 */
export function RequireAuth({ children }) {
  const { user, businessId, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1E2772] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!businessId) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

/**
 * RequireNoAuth: For /login and /signup
 * If already authenticated:
 * - Has businessId -> /dashboard
 * - No businessId -> /setup
 */
export function RequireNoAuth({ children }) {
  const { user, businessId, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]">
        <div className="w-10 h-10 border-4 border-[#1E2772] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    if (businessId) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/setup" replace />;
  }

  return children;
}

/**
 * RequireSetup: For /setup screen
 * User must be logged in. If they already have a businessId, they can still access /setup to switch or link databases.
 */
export function RequireSetup({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5FA]">
        <div className="w-10 h-10 border-4 border-[#1E2772] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
