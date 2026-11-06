import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  GraduationCap,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Building2,
  BookOpen,
  Filter,
} from 'lucide-react';
import { clsx } from 'clsx';

export function TutorsPage() {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Suspension modal state
  const [actionModal, setActionModal] = useState({ open: false, tutor: null, action: null });
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Selected tutor detail drawer
  const [selectedTutor, setSelectedTutor] = useState(null);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tutorsRes, subjectsRes, tutorSubjectsRes] = await Promise.all([
        supabase
          .from('tutor_profiles')
          .select(`
            id,
            title,
            bio,
            teaching_approach,
            institution,
            department,
            academic_level,
            hourly_rate,
            rating,
            review_count,
            is_verified,
            is_active,
            is_visible,
            approved_at,
            created_at,
            profiles:id (
              id,
              full_name,
              role
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('tutor_subjects').select('tutor_id, subject_id, subjects:subject_id(name)'),
      ]);

      if (tutorsRes.error) throw new Error(tutorsRes.error.message);

      // Map subjects into tutor records
      const subjectMap = {};
      (tutorSubjectsRes.data || []).forEach((row) => {
        if (!subjectMap[row.tutor_id]) subjectMap[row.tutor_id] = [];
        subjectMap[row.tutor_id].push({
          id: row.subject_id,
          name: row.subjects?.name || row.subject_id,
        });
      });

      const combined = (tutorsRes.data || []).map((t) => ({
        ...t,
        subjectsList: subjectMap[t.id] || [],
      }));

      setTutors(combined);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const filteredTutors = useMemo(() => {
    return tutors.filter((t) => {
      // Search term filter
      const name = t.profiles?.full_name?.toLowerCase() || '';
      const inst = t.institution?.toLowerCase() || '';
      const dept = t.department?.toLowerCase() || '';
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || inst.includes(searchTerm.toLowerCase()) || dept.includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = t.is_active === true;
      if (statusFilter === 'suspended') matchesStatus = t.is_active === false;

      // Subject filter
      let matchesSubject = true;
      if (subjectFilter !== 'all') {
        matchesSubject = t.subjectsList.some((s) => s.id === subjectFilter);
      }

      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [tutors, searchTerm, statusFilter, subjectFilter]);

  const handleToggleSuspension = async () => {
    if (!actionModal.tutor) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    const isSuspending = actionModal.action === 'suspend';

    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_set_tutor_suspension', {
        p_tutor_id: actionModal.tutor.id,
        p_suspended: isSuspending,
        p_reason: actionReason.trim() || null,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setActionSuccess(
        isSuspending
          ? `Tutor ${actionModal.tutor.profiles?.full_name || ''} has been suspended.`
          : `Tutor ${actionModal.tutor.profiles?.full_name || ''} has been reinstated.`
      );

      setActionModal({ open: false, tutor: null, action: null });
      setActionReason('');
      fetchTutors();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tutor Directory & Governance</h1>
          <p className="text-sm text-muted mt-0.5">Manage accredited tutors, verify credentials, and enforce suspensions</p>
        </div>
        <button
          onClick={fetchTutors}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-card bg-academic-light/60 border border-academic/20 text-xs font-semibold text-academic flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-card bg-red-50 border border-red-200 text-xs font-semibold text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border shadow-subtle">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tutor name, institution..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20 focus:border-academic"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20 max-w-[160px]"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tutors Grid / Table */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-academic" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-danger" />
            <p className="text-sm font-semibold text-ink">Failed to load tutors</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <GraduationCap className="w-10 h-10 text-muted" />
            <p className="text-base font-semibold text-ink">No tutors found</p>
            <p className="text-xs text-muted max-w-sm">
              {tutors.length === 0
                ? 'No tutor profiles have been approved yet. Approve pending tutor applications to populate this directory.'
                : 'No tutors matched your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTutors.map((tutor) => {
              const name = tutor.profiles?.full_name || 'Accredited Tutor';
              const isSuspended = tutor.is_active === false;
              return (
                <div
                  key={tutor.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-canvas/50 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-academic-light text-academic font-bold flex items-center justify-center shrink-0 text-base">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-ink truncate">{name}</p>
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            isSuspended
                              ? 'bg-red-50 text-danger border-red-200'
                              : 'bg-academic-light text-academic border-academic/20'
                          )}
                        >
                          {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                        {tutor.is_verified && (
                          <span className="text-[10px] font-mono text-muted flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-academic" /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {tutor.institution || 'No institution'} · {tutor.department || 'Department unlisted'}
                      </p>
                      {tutor.subjectsList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {tutor.subjectsList.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded-btn bg-border/60 text-[10px] font-semibold text-ink"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setSelectedTutor(tutor)}
                      className="px-3 py-1.5 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    {isSuspended ? (
                      <button
                        onClick={() => setActionModal({ open: true, tutor, action: 'reinstate' })}
                        className="px-3 py-1.5 rounded-btn bg-academic text-white text-xs font-semibold hover:bg-academic/90 transition-colors cursor-pointer"
                      >
                        Reinstate
                      </button>
                    ) : (
                      <button
                        onClick={() => setActionModal({ open: true, tutor, action: 'suspend' })}
                        className="px-3 py-1.5 rounded-btn border border-red-200 bg-red-50 text-danger text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionModal.open && actionModal.tutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'w-10 h-10 rounded-btn flex items-center justify-center',
                  actionModal.action === 'suspend' ? 'bg-red-50 text-danger' : 'bg-academic-light text-academic'
                )}
              >
                {actionModal.action === 'suspend' ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {actionModal.action === 'suspend' ? 'Suspend Tutor Account' : 'Reinstate Tutor Account'}
                </h3>
                <p className="text-xs text-muted">
                  {actionModal.action === 'suspend'
                    ? 'The tutor will become invisible in the marketplace and unable to accept new sessions.'
                    : 'The tutor will be restored to active directory listing and booking eligibility.'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Administrative Reason {actionModal.action === 'suspend' && <span className="text-danger">*</span>}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Log reason for suspension / reinstatement (saved to audit logs)..."
                className="w-full px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas resize-none focus:outline-none focus:ring-2 focus:ring-academic/20"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setActionModal({ open: false, tutor: null, action: null })}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspension}
                disabled={actionLoading || (actionModal.action === 'suspend' && !actionReason.trim())}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-btn text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer',
                  actionModal.action === 'suspend' ? 'bg-danger hover:bg-red-700' : 'bg-academic hover:bg-academic/90'
                )}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {actionModal.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reinstatement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Profile Drawer Modal */}
      {selectedTutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-academic-light text-academic font-bold flex items-center justify-center text-sm">
                  {(selectedTutor.profiles?.full_name || 'T').charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">{selectedTutor.profiles?.full_name}</h3>
                  <p className="text-xs text-muted font-mono">{selectedTutor.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTutor(null)}
                className="p-1 rounded-btn hover:bg-border/60 text-muted hover:text-ink transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Academic Background</p>
                <p className="text-ink mt-0.5 font-semibold">
                  {selectedTutor.institution || '—'} · {selectedTutor.department || '—'} ({selectedTutor.academic_level || '—'})
                </p>
              </div>

              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Teaching Approach & Bio</p>
                <p className="text-ink mt-0.5 leading-relaxed bg-canvas p-3 rounded-btn border border-border">
                  {selectedTutor.teaching_approach || selectedTutor.bio || 'No bio provided.'}
                </p>
              </div>

              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Teaching Subjects</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedTutor.subjectsList.length === 0 ? (
                    <span className="text-muted">None registered</span>
                  ) : (
                    selectedTutor.subjectsList.map((s) => (
                      <span key={s.id} className="px-2 py-0.5 rounded-btn bg-academic-light text-academic font-bold text-[10px]">
                        {s.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Hourly Rate</p>
                  <p className="text-ink font-mono font-bold mt-0.5">
                    ₦{(selectedTutor.hourly_rate || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Rating / Reviews</p>
                  <p className="text-ink font-semibold mt-0.5">
                    ★ {selectedTutor.rating || '5.0'} ({selectedTutor.review_count || 0} reviews)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedTutor(null)}
                className="px-4 py-2 rounded-btn bg-navy text-white text-xs font-semibold hover:bg-ink transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
