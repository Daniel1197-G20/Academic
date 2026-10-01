import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Compass, 
  Sparkles, 
  User, 
  ChevronLeft, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Avatar } from '../ui';

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  userProfile,
  onLogout,
  className = ''
}) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badge: null },
    { id: 'cgpa', label: 'CGPA & Records', icon: GraduationCap, badge: '5.0' },
    { id: 'study', label: 'Study Planner', icon: BookOpen, badge: null },
    { id: 'community', label: 'Study Groups', icon: Users, badge: 'Soon', isFuture: true },
    { id: 'tutors', label: 'Tutors', icon: Compass, badge: 'Soon', isFuture: true },
    { id: 'ai', label: 'AI Tutor', icon: Sparkles, badge: 'Soon', isFuture: true },
    { id: 'profile', label: 'Student Profile', icon: User, badge: null }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-[#07080A] border-r border-white/[0.05] transition-all duration-300 ease-in-out z-30 select-none
        ${collapsed ? 'w-20' : 'w-64'} ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-ghost-200/10 border border-ghost-200/25 flex items-center justify-center text-ghost-200 shrink-0 shadow-ghost-glow">
              <GraduationCap className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
                  ACADEMIC<span className="text-ghost-200 font-mono">OS</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  Student Platform
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-ghost-200 hover:bg-white/[0.04] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group relative
                  ${isActive
                    ? 'bg-[#12161A] text-ghost-200 border border-ghost-200/20 shadow-neu-raised-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-ghost-200 rounded-r shadow-ghost-glow" />
                )}
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-ghost-200' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        item.isFuture 
                          ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/40' 
                          : 'bg-ghost-200/10 text-ghost-200 border border-ghost-200/25'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-white/[0.04] space-y-2">
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-150 hover:bg-white/[0.02] text-left
            ${activeTab === 'profile' ? 'bg-[#12161A] border border-ghost-200/20' : ''}`}
        >
          <Avatar
            name={userProfile?.full_name || 'Student'}
            src={userProfile?.avatar_url}
            size="md"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {userProfile?.full_name || 'Student'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate font-mono">
                {userProfile?.department || 'Academic Member'}
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all duration-150
            ${collapsed ? 'justify-center' : ''}`}
          title="Sign out of platform"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
