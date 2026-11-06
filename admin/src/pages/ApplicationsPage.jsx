import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_META = {
  pending_review: { label: 'Pending Review', color: 'bg-gold/10 text-gold border-gold/20' },
  approved: { label: 'Approved', color: 'bg-academic-light text-academic border-academic/20' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-danger border-red-200' },
  assessment_passed: { label: 'Assessment Passed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  assessment_failed: { label: 'Assessment Failed', color: 'bg-red-50 text-danger border-red-200' },
  submitted: { label: 'Submitted', color: 'bg-gray-50 text-muted border-border' },
  assessment_pending: { label: 'Assessment Pending', color: 'bg-gray-50 text-muted border-border' },
  assessment_in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  draft: { label: 'Draft', color: 'bg-gray-50 text-muted border-border' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-50 text-muted border-border' },
  suspended: { label: 'Suspended', color: 'bg-red-50 text-danger border-red-200' },
};

const FILTER_TABS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'all', label: 'All Applications' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-gray-50 text-muted border-border' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', meta.color)}>
      {meta.label}
    </span>
  );
}

function ApplicationRow({ app, onClick }) {
  const name = app.profiles?.full_name || 'Unknown Applicant';
  const subjectCount = Array.isArray(app.selected_subject_ids) ? app.selected_subject_ids.length : 0;
  const score = app.assessment_score !== null && app.assessment_score !== undefined
    ? `${Number(app.assessment_score).toFixed(0)}%`
    : '—';
  const submitted = app.submitted_at
    ? new Date(app.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-canvas/70 border-b border-border last:border-b-0 transition-colors group cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-academic-light flex items-center justify-center shrink-0 text-sm font-bold text-academic">
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink truncate">{name}</p>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">
          {app.academic_level || '—'} · {subjectCount} subject{subjectCount !== 1 ? 's' : ''} · Submitted {submitted}
        </p>
      </div>

      {/* Score */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs font-semibold text-muted">Assessment</p>
        <p className={clsx('text-sm font-bold', app.assessment_passed ? 'text-academic' : app.assessment_score !== null ? 'text-danger' : 'text-muted')}>
          {score}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors shrink-0" />
    </button>
  );
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('pending_review');
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('tutor_applications')
      .select(`
        id,
        status,
        academic_level,
        selected_subject_ids,
        assessment_score,
        assessment_passed,
        submitted_at,
        created_at,
        user_id
      `)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      setApplications([]);
    } else {
      const apps = data || [];
      const userIds = [...new Set(apps.map((a) => a.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds);
        const profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
        setApplications(
          apps.map((a) => ({
            ...a,
            profiles: profMap[a.user_id] || { id: a.user_id, full_name: 'Applicant', role: 'student' },
          }))
        );
      } else {
        setApplications(apps);
      }
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = useMemo(() => {
    if (!searchTerm.trim()) return applications;
    const term = searchTerm.toLowerCase();
    return applications.filter((app) => {
      const name = app.profiles?.full_name?.toLowerCase() || '';
      const level = app.academic_level?.toLowerCase() || '';
      return name.includes(term) || level.includes(term);
    });
  }, [applications, searchTerm]);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tutor Applications</h1>
          <p className="text-sm text-muted mt-0.5">Review, assess, and action prospective tutors</p>
        </div>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-border/40 rounded-btn w-fit overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={clsx(
                'px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                filter === tab.value
                  ? 'bg-surface text-ink shadow-subtle'
                  : 'text-muted hover:text-ink'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search applicant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-btn border border-border text-xs text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-academic/20 focus:border-academic"
          />
        </div>
      </div>

      {/* Content Table Card */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-academic" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-danger" />
            <p className="text-sm font-semibold text-ink">Failed to load applications</p>
            <p className="text-xs text-muted">{error}</p>
            <button
              onClick={fetchApplications}
              className="mt-1 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            {searchTerm ? (
              <Search className="w-8 h-8 text-muted" />
            ) : filter === 'pending_review' ? (
              <CheckCircle2 className="w-8 h-8 text-academic" />
            ) : (
              <Clock className="w-8 h-8 text-muted" />
            )}
            <p className="text-sm font-semibold text-ink">
              {searchTerm ? 'No matching applicants found' : filter === 'pending_review' ? 'All caught up!' : 'No applications found'}
            </p>
            <p className="text-xs text-muted">
              {searchTerm
                ? `No applications matched "${searchTerm}".`
                : filter === 'pending_review'
                ? 'No applications are currently awaiting administrative review.'
                : `No applications currently have status "${filter}".`}
            </p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden sm:flex items-center gap-4 px-5 py-3 border-b border-border bg-canvas/50">
              <div className="w-9" />
              <p className="flex-1 text-[10px] font-bold text-muted uppercase tracking-wider">Applicant</p>
              <p className="w-24 text-right text-[10px] font-bold text-muted uppercase tracking-wider">Score</p>
              <div className="w-4" />
            </div>
            {filteredApplications.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onClick={() => navigate(`/applications/${app.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && !error && filteredApplications.length > 0 && (
        <p className="text-xs text-muted text-right">
          Showing {filteredApplications.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
