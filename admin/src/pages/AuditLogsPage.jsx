import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Calendar,
  Filter,
  User,
  Activity,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Selected log detail modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Direct query on public.admin_audit_logs protected by RLS
      const { data, error: err } = await supabase
        .from('admin_audit_logs')
        .select(`
          id,
          actor_id,
          action,
          target_type,
          target_id,
          metadata,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (err) throw new Error(err.message);
      setLogs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Unique actions list for filter
  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const act = l.action?.toLowerCase() || '';
      const type = l.target_type?.toLowerCase() || '';
      const targetId = l.target_id?.toLowerCase() || '';
      const actorId = l.actor_id?.toLowerCase() || '';
      const matchesSearch =
        !searchTerm ||
        act.includes(searchTerm.toLowerCase()) ||
        type.includes(searchTerm.toLowerCase()) ||
        targetId.includes(searchTerm.toLowerCase()) ||
        actorId.includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'all' || l.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const getActionBadge = (action) => {
    if (action.includes('APPROVED')) return 'bg-academic-light text-academic border-academic/20';
    if (action.includes('REJECTED') || action.includes('SUSPENDED')) return 'bg-red-50 text-danger border-red-200';
    if (action.includes('REINSTATED')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-canvas text-muted border-border';
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Administrative Audit Trail</h1>
          <p className="text-sm text-muted mt-0.5">Immutable log of security-sensitive operations, approvals, and decisions</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Security integrity banner */}
      <div className="p-3.5 rounded-card bg-surface border border-border shadow-subtle flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-academic shrink-0 mt-0.5" />
        <div className="text-xs text-muted leading-relaxed">
          <span className="font-semibold text-ink">Tamper-Evident Security Log:</span> Audit records are written exclusively by server-side RPCs executing under SECURITY DEFINER privileges. Records cannot be edited, overwritten, or deleted through the administration interface.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border shadow-subtle">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, target ID, admin UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20 focus:border-academic"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
          >
            <option value="all">All Actions</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-academic" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-danger" />
            <p className="text-sm font-semibold text-ink">Failed to load audit logs</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <ShieldCheck className="w-10 h-10 text-muted" />
            <p className="text-base font-semibold text-ink">No audit logs found</p>
            <p className="text-xs text-muted">No administrative operations match the search or filter query.</p>
          </div>
        ) : (
          <div>
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
              <span className="col-span-3">Action</span>
              <span className="col-span-3">Target Entity</span>
              <span className="col-span-3">Administrator</span>
              <span className="col-span-3 text-right">Timestamp</span>
            </div>

            <div className="divide-y divide-border">
              {filteredLogs.map((log) => {
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 cursor-pointer transition-colors"
                  >
                    <div className="col-span-3">
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase', getActionBadge(log.action))}>
                        {log.action}
                      </span>
                    </div>

                    <div className="col-span-3 min-w-0 mt-1 sm:mt-0">
                      <p className="text-xs font-semibold text-ink truncate capitalize">
                        {log.target_type?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-muted font-mono truncate">{log.target_id}</p>
                    </div>

                    <div className="col-span-3 min-w-0 mt-1 sm:mt-0">
                      <p className="text-xs text-ink truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-muted" />
                        <span className="font-mono text-[11px]">{log.actor_id?.substring(0, 8)}...</span>
                      </p>
                    </div>

                    <div className="col-span-3 text-right text-xs text-muted font-mono mt-1 sm:mt-0">
                      {new Date(log.created_at).toLocaleString('en-GB')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!loading && !error && (
        <p className="text-xs text-muted text-right">
          Showing {filteredLogs.length} of {logs.length} audit record{logs.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase', getActionBadge(selectedLog.action))}>
                  {selectedLog.action}
                </span>
                <span className="text-xs font-bold text-ink capitalize">
                  {selectedLog.target_type?.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Record ID</p>
                <p className="font-mono text-ink mt-0.5 select-all">{selectedLog.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Target Record ID</p>
                  <p className="font-mono text-ink mt-0.5 select-all truncate">{selectedLog.target_id}</p>
                </div>
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Administrator UUID</p>
                  <p className="font-mono text-ink mt-0.5 select-all truncate">{selectedLog.actor_id}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Timestamp</p>
                <p className="font-mono text-ink mt-0.5">
                  {new Date(selectedLog.created_at).toLocaleString('en-GB')}
                </p>
              </div>

              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Metadata & Payload</p>
                <pre className="mt-1 p-3 rounded-btn bg-canvas border border-border text-[11px] font-mono text-ink overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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
