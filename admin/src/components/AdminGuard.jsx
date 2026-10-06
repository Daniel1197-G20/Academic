import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AdminGuard
 *
 * Enforces: authenticated user + profiles.role === 'admin'
 * Non-admin, unauthenticated, or student/tutor users are denied.
 * Direct URL access is protected — the guard wraps all admin routes.
 */
export function AdminGuard({ children }) {
  const { session, profile, loading, isAdmin } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-6 h-6 animate-spin text-academic" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Authenticated but not admin — deny and show access error
    return <Navigate to="/denied" replace />;
  }

  return children;
}
