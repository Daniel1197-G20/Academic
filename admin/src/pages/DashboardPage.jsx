import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, GraduationCap, Users, Clock, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-surface rounded-card border border-border shadow-subtle p-5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-btn flex items-center justify-center shrink-0"
        style={{ backgroundColor: accent + '18', color: accent }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        {value === null ? (
          <div className="h-6 w-12 bg-border rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-2xl font-bold text-ink mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: null, total: null, tutors: null, users: null });

  useEffect(() => {
    async function load() {
      const [pendingRes, totalRes, tutorsRes, usersRes] = await Promise.all([
        supabase
          .from('tutor_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_review'),
        supabase
          .from('tutor_applications')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'tutor'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        pending: pendingRes.count ?? 0,
        total: totalRes.count ?? 0,
        tutors: tutorsRes.count ?? 0,
        users: usersRes.count ?? 0,
      });
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {greeting}, {profile?.full_name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="text-sm text-muted mt-1">Studora Admin Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} accent="#C89B3C" />
        <StatCard label="Total Applications" value={stats.total} icon={FileText} accent="#176B4D" />
        <StatCard label="Active Tutors" value={stats.tutors} icon={GraduationCap} accent="#176B4D" />
        <StatCard label="Total Users" value={stats.users} icon={Users} accent="#667085" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-ink mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-3 p-4 bg-surface rounded-card border border-border shadow-subtle hover:border-academic hover:shadow-card transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-academic-light flex items-center justify-center">
              <FileText className="w-4 h-4 text-academic" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink group-hover:text-academic transition-colors">
                Review Applications
              </p>
              <p className="text-xs text-muted">
                {stats.pending !== null ? `${stats.pending} pending` : '—'} tutor application{stats.pending !== 1 ? 's' : ''}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3 p-4 bg-surface/60 rounded-card border border-border/60 cursor-not-allowed opacity-50 select-none">
            <div className="w-9 h-9 rounded-btn bg-border flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">Manage Tutors</p>
              <p className="text-xs text-muted">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* System status note */}
      <div className="p-4 rounded-card border border-academic-light bg-academic-light/40 text-xs text-academic font-medium">
        All privileged operations are enforced server-side via SECURITY DEFINER RPCs. Admin access is determined by{' '}
        <span className="font-mono">profiles.role</span> in the database.
      </div>
    </div>
  );
}
