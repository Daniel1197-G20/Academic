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
import { TutorsPage } from './pages/TutorsPage';
import { UsersPage } from './pages/UsersPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

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
            <Route path="/tutors" element={<TutorsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/withdrawals" element={<PaymentsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
