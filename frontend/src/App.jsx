import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RequireAuth, RequireNoAuth, RequireSetup } from "./components/RouteGuards";
import Login from "./pages/Login";
import BusinessSetup from "./pages/BusinessSetup";
import AppShell from "./components/AppShell";

// Exported public route constant for the landing page button
export const LOGIN_ROUTE = "/login";
export const DASHBOARD_ROUTE = "/dashboard";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Customers from "./pages/Customers";
import Conversations from "./pages/Conversations";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <RequireNoAuth>
                  <Login />
                </RequireNoAuth>
              }
            />
            <Route
              path="/signup"
              element={
                <RequireNoAuth>
                  <Login />
                </RequireNoAuth>
              }
            />

            {/* First-time Business Setup */}
            <Route
              path="/setup"
              element={
                <RequireSetup>
                  <BusinessSetup />
                </RequireSetup>
              }
            />

            {/* Protected Dashboard Shell */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="customers" element={<Customers />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
