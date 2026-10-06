import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminGuard } from './components/AdminGuard';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ApplicationReviewPage } from './pages/ApplicationReviewPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ComingSoonPage } from './pages/ComingSoonPage';

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/denied" element={<AccessDeniedPage />} />

          {/* Protected admin routes */}
          <Route
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationReviewPage />} />

            {/* Admin Financial Module */}
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/withdrawals" element={<PaymentsPage />} />

            {/* Coming-soon modules */}
            <Route path="/tutors" element={<ComingSoonPage title="Tutors" />} />
            <Route path="/users" element={<ComingSoonPage title="Users" />} />
            <Route path="/assessments" element={<ComingSoonPage title="Assessments" />} />
            <Route path="/audit-logs" element={<ComingSoonPage title="Audit Logs" />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

