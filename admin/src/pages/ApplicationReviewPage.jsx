import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  GraduationCap,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  Calendar,
  Clock,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-surface rounded-card border border-border shadow-subtle p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Icon className="w-4 h-4 text-academic" />
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className={clsx('text-sm text-ink mt-0.5', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  );
}

function ScoreMeter({ score, passed, passPct = 70 }) {
  if (score === null || score === undefined) {
    return <p className="text-sm text-muted">No assessment data</p>;
  }

  const pct = Math.min(100, Math.max(0, Number(score)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={clsx('text-2xl font-bold', passed ? 'text-academic' : 'text-danger')}>
          {pct.toFixed(0)}%
        </span>
        <span
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
            passed
              ? 'bg-academic-light text-academic border-academic/20'
              : 'bg-red-50 text-danger border-red-200'
          )}
        >
          {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {passed ? 'Passed' : 'Failed'}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', passed ? 'bg-academic' : 'bg-danger')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted">Pass threshold: {passPct}%</p>
    </div>
  );
}

/* ─── Review Modal ─────────────────────────────────────────────────────────── */

function ReviewModal({ open, decision, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) { setReason(''); setNotes(''); }
  }, [open]);

  if (!open) return null;

  const isApprove = decision === 'approve';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-md space-y-5 p-6">
        <div className="flex items-center gap-3">
          {isApprove ? (
            <div className="w-10 h-10 rounded-btn bg-academic-light flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-academic" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-btn bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-danger" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-ink">
              {isApprove ? 'Approve Application' : 'Reject Application'}
            </h2>
            <p className="text-xs text-muted">
              {isApprove
                ? 'This will grant the applicant tutor authorization via the secure RPC.'
                : 'The applicant remains a student. No tutor access is granted.'}
            </p>
          </div>
        </div>

        {!isApprove && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for rejection (required)…"
              className="w-full px-3 py-2.5 rounded-btn border border-border text-sm text-ink bg-canvas resize-none focus:outline-none focus:ring-2 focus:ring-academic/30 focus:border-academic"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Admin Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes for the audit log…"
            className="w-full px-3 py-2.5 rounded-btn border border-border text-sm text-ink bg-canvas resize-none focus:outline-none focus:ring-2 focus:ring-academic/30 focus:border-academic"
          />
        </div>

        {isApprove && (
          <div className="p-3 rounded-btn bg-academic-light/60 border border-academic/20 text-xs text-academic font-medium">
            The <span className="font-mono">admin_review_tutor_application()</span> SECURITY DEFINER RPC
            will update <span className="font-mono">profiles.role</span>, upsert{' '}
            <span className="font-mono">tutor_profiles</span>, and create an audit log record — all server-side.
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-btn border border-border text-sm font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim(), notes.trim())}
            disabled={loading || (!isApprove && !reason.trim())}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
              isApprove ? 'bg-academic hover:bg-academic/90' : 'bg-danger hover:bg-red-700'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing…' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Review Page ─────────────────────────────────────────────────────── */

export function ApplicationReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [modal, setModal] = useState(null); // 'approve' | 'reject' | null
  const [actioning, setActioning] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [appRes, attemptsRes] = await Promise.all([
      supabase
        .from('tutor_applications')
        .select(`
          id, status, academic_level, programme, graduation_year, institution, department,
          selected_subject_ids, has_teaching_experience, experience_types, experience_description,
          teaching_level, bio, teaching_approach, areas_of_expertise,
          assessment_score, assessment_passed,
          submitted_at, reviewed_at, reviewed_by,
          rejection_reason, admin_notes, created_at, updated_at,
          profiles:user_id (
            id, full_name, role
          )
        `)
        .eq('id', id)
        .single(),

      supabase
        .from('assessment_attempts')
        .select('id, status, score, passed, total_questions, correct_answers_count, time_limit_minutes, started_at, completed_at, time_spent_seconds')
        .eq('application_id', id)
        .order('started_at', { ascending: false }),
    ]);

    if (appRes.error) {
      setError(appRes.error.message);
    } else {
      setApp(appRes.data);
    }

    setAttempts(attemptsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDecision = async (reason, notes) => {
    setActioning(true);
    setActionError(null);

    const { data, error: rpcErr } = await supabase.rpc('admin_review_tutor_application', {
      p_application_id: id,
      p_decision: modal,
      p_rejection_reason: reason || null,
      p_admin_notes: notes || null,
    });

    setActioning(false);

    if (rpcErr) {
      setActionError(rpcErr.message);
      setModal(null);
      return;
    }

    setModal(null);
    setActionSuccess(modal === 'approve' ? 'Application approved. Tutor authorization granted.' : 'Application rejected. Applicant remains a student.');
    // Reload to reflect new state
    await fetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-academic" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate('/applications')} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm font-semibold text-ink">Application not found</p>
          <p className="text-xs text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const name = app.profiles?.full_name || 'Unknown Applicant';
  const isPending = app.status === 'pending_review';
  const isApproved = app.status === 'approved';
  const isRejected = app.status === 'rejected';
  const subjects = Array.isArray(app.selected_subject_ids) ? app.selected_subject_ids : [];
  const latestAttempt = attempts[0] || null;

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Tutor Applications
      </button>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-academic-light flex items-center justify-center text-base font-bold text-academic shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{name}</h1>
            <p className="text-xs text-muted font-mono">
              Application ID: {app.id.slice(0, 8)}…
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
            isApproved ? 'bg-academic-light text-academic border-academic/20'
              : isRejected ? 'bg-red-50 text-danger border-red-200'
              : isPending ? 'bg-gold/10 text-gold border-gold/20'
              : 'bg-gray-50 text-muted border-border'
          )}>
            {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
            {isRejected && <XCircle className="w-3.5 h-3.5" />}
            {isPending && <Clock className="w-3.5 h-3.5" />}
            {app.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Action messages */}
      {actionSuccess && (
        <div className="p-4 rounded-card bg-academic-light border border-academic/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-academic shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-academic">{actionSuccess}</p>
            <p className="text-xs text-academic/70 mt-0.5">The audit log has been created server-side.</p>
          </div>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-card bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">Action failed</p>
            <p className="text-xs text-danger/80 mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {/* Approve / Reject actions */}
      {isPending && !actionSuccess && (
        <div className="flex gap-3">
          <button
            onClick={() => { setActionError(null); setModal('approve'); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn bg-academic text-white text-sm font-semibold hover:bg-academic/90 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => { setActionError(null); setModal('reject'); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn border border-red-200 text-danger text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {/* Rejection reason (if rejected) */}
      {isRejected && app.rejection_reason && (
        <Section icon={XCircle} title="Rejection Reason">
          <p className="text-sm text-ink">{app.rejection_reason}</p>
          {app.admin_notes && <p className="text-xs text-muted italic">Admin notes: {app.admin_notes}</p>}
        </Section>
      )}

      {/* Applicant profile */}
      <Section icon={User} title="Applicant">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={name} />
          <Field label="Current Role" value={app.profiles?.role} mono />
          <Field label="Academic Level" value={app.academic_level} />
          <Field label="Programme" value={app.programme} />
          <Field label="Institution" value={app.institution} />
          <Field label="Department" value={app.department} />
          <Field label="Graduation Year" value={app.graduation_year} />
        </div>
      </Section>

      {/* Assessment */}
      <Section icon={ClipboardList} title="Assessment">
        <ScoreMeter
          score={app.assessment_score}
          passed={app.assessment_passed}
        />

        {latestAttempt && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Latest Attempt</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" value={latestAttempt.status} mono />
              <Field
                label="Score"
                value={latestAttempt.score !== null ? `${Number(latestAttempt.score).toFixed(0)}%` : '—'}
              />
              <Field
                label="Correct Answers"
                value={
                  latestAttempt.correct_answers_count !== null
                    ? `${latestAttempt.correct_answers_count} / ${latestAttempt.total_questions}`
                    : '—'
                }
              />
              <Field
                label="Time Spent"
                value={
                  latestAttempt.time_spent_seconds
                    ? `${Math.floor(latestAttempt.time_spent_seconds / 60)}m ${latestAttempt.time_spent_seconds % 60}s`
                    : '—'
                }
              />
              <Field
                label="Completed"
                value={
                  latestAttempt.completed_at
                    ? new Date(latestAttempt.completed_at).toLocaleString('en-GB')
                    : '—'
                }
              />
            </div>
          </div>
        )}

        {attempts.length > 1 && (
          <p className="text-xs text-muted mt-2">{attempts.length} total attempt{attempts.length !== 1 ? 's' : ''} recorded.</p>
        )}
      </Section>

      {/* Subjects */}
      <Section icon={BookOpen} title="Subjects">
        {subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-academic-light text-academic text-xs font-semibold border border-academic/20">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No subjects selected.</p>
        )}
      </Section>

      {/* Teaching background */}
      <Section icon={GraduationCap} title="Teaching Background">
        <div className="space-y-3">
          <Field label="Teaching Level" value={app.teaching_level} />
          <Field label="Has Teaching Experience" value={app.has_teaching_experience ? 'Yes' : 'No'} />
          {app.experience_description && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Experience Description</p>
              <p className="text-sm text-ink mt-0.5 leading-relaxed">{app.experience_description}</p>
            </div>
          )}
          {app.bio && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Bio</p>
              <p className="text-sm text-ink mt-0.5 leading-relaxed">{app.bio}</p>
            </div>
          )}
          {app.teaching_approach && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Teaching Approach</p>
              <p className="text-sm text-ink mt-0.5 leading-relaxed">{app.teaching_approach}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Timeline */}
      <Section icon={Calendar} title="Timeline">
        <div className="space-y-2">
          <Field label="Created" value={new Date(app.created_at).toLocaleString('en-GB')} />
          {app.submitted_at && (
            <Field label="Submitted" value={new Date(app.submitted_at).toLocaleString('en-GB')} />
          )}
          {app.reviewed_at && (
            <Field label="Reviewed" value={new Date(app.reviewed_at).toLocaleString('en-GB')} />
          )}
        </div>
      </Section>

      {/* Repeat actions at bottom */}
      {isPending && !actionSuccess && (
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => { setActionError(null); setModal('approve'); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn bg-academic text-white text-sm font-semibold hover:bg-academic/90 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => { setActionError(null); setModal('reject'); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-btn border border-red-200 text-danger text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {/* Review modal */}
      <ReviewModal
        open={modal !== null}
        decision={modal}
        onClose={() => setModal(null)}
        onConfirm={handleDecision}
        loading={actioning}
      />
    </div>
  );
}
