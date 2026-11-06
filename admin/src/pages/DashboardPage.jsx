import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  FileText,
  GraduationCap,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { clsx } from 'clsx';

function StatCard({ label, value, icon: Icon, accent, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-surface rounded-card border border-border shadow-subtle p-5 flex flex-col justify-between transition-all',
        onClick && 'cursor-pointer hover:border-academic hover:shadow-card group'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <div
          className="w-8 h-8 rounded-btn flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent + '18', color: accent }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        {value === null ? (
          <div className="h-7 w-16 bg-border/60 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-ink tracking-tight">{value}</p>
        )}
        {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: null,
    totalStudents: null,
    totalTutors: null,
    activeTutors: null,
    pendingApps: null,
    approvedApps: null,
    rejectedApps: null,
    totalQuestions: null,
    totalBillingVolume: null,
    totalTransactions: null,
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch counts from Supabase
      const [
        totalUsersRes,
        studentsRes,
        tutorsRes,
        pendingAppsRes,
        approvedAppsRes,
        rejectedAppsRes,
        activeTutorsRes,
        questionsRes,
        logsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'tutor'),
        supabase.from('tutor_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('tutor_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('tutor_applications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('question_bank').select('id', { count: 'exact', head: true }),
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(6),
      ]);

      // 2. Fetch billing metrics if available from backend server
      let billingData = { totalRevenueNgn: 0, totalTransactions: 0 };
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token;
        const res = await fetch('/api/admin/billing', {
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.metrics) {
            billingData = json.metrics;
          }
        }
      } catch (err) {
        // Fallback gracefully if Node server dev proxy is unreachable
      }

      setStats({
        totalUsers: totalUsersRes.count ?? 0,
        totalStudents: studentsRes.count ?? 0,
        totalTutors: tutorsRes.count ?? 0,
        activeTutors: activeTutorsRes.count ?? 0,
        pendingApps: pendingAppsRes.count ?? 0,
        approvedApps: approvedAppsRes.count ?? 0,
        rejectedApps: rejectedAppsRes.count ?? 0,
        totalQuestions: questionsRes.count ?? 0,
        totalBillingVolume: billingData.totalRevenueNgn,
        totalTransactions: billingData.totalTransactions,
      });

      setRecentLogs(logsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {greeting}, {profile?.full_name?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-xs text-muted mt-1">Platform overview & live operational status</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-red-50 border border-red-200 text-xs text-danger font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Error loading dashboard metrics: {error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={stats.totalUsers}
          icon={Users}
          accent="#172033"
          subtitle={`${stats.totalStudents ?? '—'} students · ${stats.totalTutors ?? '—'} tutors`}
          onClick={() => navigate('/users')}
        />
        <StatCard
          label="Pending Applications"
          value={stats.pendingApps}
          icon={Clock}
          accent="#C89B3C"
          subtitle={`${stats.approvedApps ?? '—'} approved · ${stats.rejectedApps ?? '—'} rejected`}
          onClick={() => navigate('/applications')}
        />
        <StatCard
          label="Active Tutors"
          value={stats.activeTutors}
          icon={GraduationCap}
          accent="#176B4D"
          subtitle="Accredited & visible"
          onClick={() => navigate('/tutors')}
        />
        <StatCard
          label="Question Bank"
          value={stats.totalQuestions}
          icon={HelpCircle}
          accent="#4F46E5"
          subtitle="Curated questions across subjects"
          onClick={() => navigate('/assessments')}
        />
      </div>

      {/* Secondary Financial & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Overview Card */}
        <div className="bg-surface rounded-card border border-border shadow-subtle p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-academic" />
                <h3 className="text-sm font-bold text-ink">Subscription Billing</h3>
              </div>
              <button
                onClick={() => navigate('/payments')}
                className="text-xs text-academic hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Ledger <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Subscription Revenue</p>
                <p className="text-2xl font-extrabold text-ink font-mono mt-0.5">
                  {stats.totalBillingVolume !== null ? formatNaira(stats.totalBillingVolume) : '—'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className="text-xs text-muted">Successful Transactions</span>
                <span className="text-xs font-bold text-ink">{stats.totalTransactions ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Platform Commission Model</span>
                <span className="text-xs font-bold text-academic">20% Platform / 80% Tutor</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="w-full mt-4 py-2 px-3 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors text-center cursor-pointer"
          >
            Open Financial & Payout Console
          </button>
        </div>

        {/* Recent Admin Audit Activity */}
        <div className="lg:col-span-2 bg-surface rounded-card border border-border shadow-subtle p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-academic" />
                <h3 className="text-sm font-bold text-ink">Recent Administrative Activity</h3>
              </div>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs text-academic hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                All Logs <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-border/60 mt-2">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">No recent administrative actions recorded.</div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-academic shrink-0" />
                      <span className="font-semibold text-ink truncate">{log.action}</span>
                      <span className="text-muted truncate">({log.target_type})</span>
                    </div>
                    <span className="text-[11px] text-muted shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
            <span>Audit trail is immutable and enforced via database RLS</span>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-academic font-semibold hover:underline cursor-pointer"
            >
              View detailed audit log &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Administrative Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-3 p-4 bg-surface rounded-card border border-border shadow-subtle hover:border-academic hover:shadow-card transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-academic-light flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-academic" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink group-hover:text-academic transition-colors">Tutor Applications</p>
              <p className="text-[11px] text-muted truncate">{stats.pendingApps ?? 0} pending review</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/tutors')}
            className="flex items-center gap-3 p-4 bg-surface rounded-card border border-border shadow-subtle hover:border-academic hover:shadow-card transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-academic-light flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-academic" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink group-hover:text-academic transition-colors">Tutor Directory</p>
              <p className="text-[11px] text-muted truncate">{stats.activeTutors ?? 0} accredited tutors</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/assessments')}
            className="flex items-center gap-3 p-4 bg-surface rounded-card border border-border shadow-subtle hover:border-academic hover:shadow-card transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-academic-light flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-academic" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink group-hover:text-academic transition-colors">Question Bank</p>
              <p className="text-[11px] text-muted truncate">{stats.totalQuestions ?? 0} questions</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-3 p-4 bg-surface rounded-card border border-border shadow-subtle hover:border-academic hover:shadow-card transition-all text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-academic-light flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-academic" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink group-hover:text-academic transition-colors">User Management</p>
              <p className="text-[11px] text-muted truncate">{stats.totalUsers ?? 0} registered</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
