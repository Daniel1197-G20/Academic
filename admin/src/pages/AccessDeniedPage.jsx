import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, LogOut } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AccessDeniedPage() {
  const { profile, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-card bg-red-50 border border-red-200 mb-5">
          <ShieldOff className="w-7 h-7 text-danger" />
        </div>
        <h1 className="text-xl font-bold text-ink">Access Denied</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Your account{profile?.full_name ? ` (${profile.full_name})` : ''} does not have administrator privileges.
          Contact a Studora administrator if you believe this is an error.
        </p>
        {profile && (
          <p className="mt-3 font-mono text-xs text-muted">
            role: <span className="text-ink font-semibold">{profile.role}</span>
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-navy text-white text-sm font-semibold hover:bg-ink transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
