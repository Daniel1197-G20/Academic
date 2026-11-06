import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Shield,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Lock,
} from 'lucide-react';
import { clsx } from 'clsx';

export function UsersPage() {
  const { profile: currentAdmin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'student' | 'tutor' | 'admin'

  // Selected user detail modal
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          institution,
          department,
          academic_level,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (err) throw new Error(err.message);
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = u.full_name?.toLowerCase() || '';
      const inst = u.institution?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || inst.includes(searchTerm.toLowerCase()) || dept.includes(searchTerm.toLowerCase());

      let matchesRole = true;
      if (roleFilter !== 'all') {
        matchesRole = u.role === roleFilter;
      }

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-navy text-white border-navy';
      case 'tutor':
        return 'bg-academic-light text-academic border-academic/20';
      case 'student':
      default:
        return 'bg-canvas text-muted border-border';
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">User Administration</h1>
          <p className="text-sm text-muted mt-0.5">Browse registered students, tutors, and administrative personnel</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn border border-border text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Security notice */}
      <div className="p-3.5 rounded-card bg-surface border border-border shadow-subtle flex items-start gap-3">
        <Lock className="w-4 h-4 text-academic shrink-0 mt-0.5" />
        <div className="text-xs text-muted leading-relaxed">
          <span className="font-semibold text-ink">Administrative Account Protection Active:</span> Roles are governed by PostgreSQL triggers (<span className="font-mono">trg_protect_profile_role</span>) and server-side RPCs. Direct browser modification of roles is blocked at the database level to prevent accidental privilege loss or elevation.
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border shadow-subtle">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by full name, institution..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20 focus:border-academic"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-btn border border-border text-xs text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-academic/20"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="tutor">Tutors</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Users List Card */}
      <div className="bg-surface rounded-card border border-border shadow-subtle overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-academic" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-danger" />
            <p className="text-sm font-semibold text-ink">Failed to load platform users</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <Users className="w-10 h-10 text-muted" />
            <p className="text-base font-semibold text-ink">No users found</p>
            <p className="text-xs text-muted">No accounts match the current filter or search criteria.</p>
          </div>
        ) : (
          <div>
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-canvas/50 text-[10px] font-bold text-muted uppercase tracking-wider">
              <span className="col-span-5">User Profile</span>
              <span className="col-span-2">Role</span>
              <span className="col-span-3">Academic Institution</span>
              <span className="col-span-2 text-right">Registered</span>
            </div>

            <div className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const name = u.full_name || 'Anonymous User';
                const isCurrentSelf = currentAdmin?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="p-4 sm:px-5 sm:py-3.5 sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-canvas/50 cursor-pointer transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-academic-light text-academic font-bold flex items-center justify-center shrink-0 text-xs">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-ink truncate">{name}</p>
                          {isCurrentSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-academic-light text-academic">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted font-mono truncate">{u.id}</p>
                      </div>
                    </div>

                    <div className="col-span-2 mt-1 sm:mt-0">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase', getRoleBadge(u.role))}>
                        {u.role}
                      </span>
                    </div>

                    <div className="col-span-3 min-w-0 mt-1 sm:mt-0">
                      <p className="text-xs text-ink truncate">{u.institution || '—'}</p>
                      <p className="text-[10px] text-muted truncate">{u.department || '—'}</p>
                    </div>

                    <div className="col-span-2 text-right text-xs text-muted font-mono mt-1 sm:mt-0">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
          Showing {filteredUsers.length} of {users.length} registered user{users.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-card border border-border shadow-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-academic-light text-academic font-bold flex items-center justify-center text-sm">
                  {(selectedUser.full_name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">{selectedUser.full_name}</h3>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase', getRoleBadge(selectedUser.role))}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-btn hover:bg-border/60 text-muted hover:text-ink transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">User Identifier (UUID)</p>
                <p className="font-mono text-ink mt-0.5 select-all">{selectedUser.id}</p>
              </div>

              <div>
                <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Academic Affiliation</p>
                <p className="text-ink mt-0.5 font-semibold">
                  {selectedUser.institution || 'No institution listed'}
                </p>
                <p className="text-muted text-[11px] mt-0.5">
                  {selectedUser.department || 'No department listed'} · Level: {selectedUser.academic_level || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-[11px]">
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Account Created</p>
                  <p className="text-ink font-mono mt-0.5">
                    {new Date(selectedUser.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-muted uppercase tracking-wider text-[10px]">Last Updated</p>
                  <p className="text-ink font-mono mt-0.5">
                    {new Date(selectedUser.updated_at).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
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
