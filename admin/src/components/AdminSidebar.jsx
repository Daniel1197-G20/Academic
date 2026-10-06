import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  CreditCard,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/applications', label: 'Tutor Applications', icon: FileText },
  { to: '/payments', label: 'Payments & Payouts', icon: CreditCard },
  { to: '/tutors', label: 'Tutors', icon: GraduationCap, disabled: true },
  { to: '/users', label: 'Users', icon: Users, disabled: true },
  { to: '/assessments', label: 'Assessments', icon: ScrollText, disabled: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck, disabled: true },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-navy text-white transition-all duration-200 ease-out shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-2.5 px-4 py-5 border-b border-white/10', collapsed && 'justify-center px-0')}>
        <div className="w-7 h-7 rounded-md bg-academic flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-none">Studora</p>
            <p className="text-[10px] text-white/50 font-mono mt-0.5 uppercase tracking-wider">Admin</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, disabled }) => {
          if (disabled) {
            return (
              <div
                key={to}
                title={collapsed ? label : undefined}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/30 cursor-not-allowed select-none',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!collapsed && (
                  <span className="ml-auto text-[9px] font-mono text-white/25 uppercase tracking-wider">soon</span>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors duration-150',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Admin identity + sign out */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed && profile && (
          <div className="px-1">
            <p className="text-xs font-semibold text-white truncate">{profile.full_name || 'Admin'}</p>
            <p className="text-[10px] text-white/40 font-mono">role: admin</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={clsx(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-navy border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors cursor-pointer z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
