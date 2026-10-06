import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  FileCheck2, 
  Compass, 
  MessageSquare, 
  User, 
  Settings, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  CreditCard,
  Sparkles,
  Award,
} from 'lucide-react';
import { Avatar, StudoraMark } from '../ui';

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  userProfile,
  onLogout,
  className = ''
}) {
  // Nav label is role-aware: approved tutors see "Tutor Workspace", students see "Become a Tutor"
  const isTutor = userProfile?.role === 'tutor';
  const isStudent = !userProfile?.role || userProfile.role === 'student';

  const mainNav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'cgpa', label: 'CGPA', icon: GraduationCap },
    { id: 'study', label: 'Study Planner', icon: BookOpen },
    { id: 'test-prep', label: 'Test Prep', icon: FileCheck2 },
    { id: 'tutors', label: 'Tutors', icon: Compass },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    // Role-aware tutoring nav item
    ...(isTutor
      ? [{ id: 'become-tutor', label: 'Tutor Workspace', icon: Award }]
      : isStudent
      ? [{ id: 'become-tutor', label: 'Become a Tutor', icon: Award }]
      : []),
  ];

  const personalNav = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings/subscription', label: 'Subscription', icon: CreditCard },
    { id: 'pricing', label: 'Plans & Pricing', icon: Sparkles },
    { id: 'privacy-settings', label: 'Privacy', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-white border-r border-border transition-all duration-200 ease-in-out z-30 select-none sticky top-0 h-screen shrink-0 overflow-y-auto
        ${collapsed ? 'w-16' : 'w-60'} ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-academic-100 flex items-center justify-center text-academic shrink-0 border border-academic-200/50 shadow-tactile-surface">
              <StudoraMark className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-ink font-sans">
                  Studora
                </span>
                <span className="text-[10px] text-muted tracking-tight font-medium">
                  Academic Platform
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-muted hover:text-ink hover:bg-gray-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-5">
          {/* Main Section */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold text-muted/80 tracking-wider uppercase">
                Main
              </p>
            )}
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = (item.id === 'dashboard' && (activeTab === 'dashboard' || activeTab === 'overview'))
                || (item.id === 'test-prep' && (activeTab === 'test-prep' || activeTab === 'prep'))
                || (item.id === 'messages' && (activeTab === 'messages' || activeTab === 'community'))
                || (item.id === 'become-tutor' && activeTab === 'become-tutor')
                || activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs sm:text-sm transition-all text-left group select-none
                    ${isActive
                      ? 'bg-white text-ink font-semibold border border-border shadow-tactile-surface'
                      : 'text-muted hover:text-ink hover:bg-canvas/80 border border-transparent'}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-academic' : 'text-muted group-hover:text-ink'}`} />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-canvas border border-border text-muted">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Personal Section */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold text-muted/80 tracking-wider uppercase">
                Personal
              </p>
            )}
            {personalNav.map((item) => {
              const Icon = item.icon;
              const isActive = (item.id === 'settings/subscription' && (activeTab === 'settings/subscription' || activeTab === 'settings' || activeTab === 'settings-subscription'))
                || activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs sm:text-sm transition-all text-left group select-none
                    ${isActive
                      ? 'bg-white text-ink font-semibold border border-border shadow-tactile-surface'
                      : 'text-muted hover:text-ink hover:bg-canvas/80 border border-transparent'}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-academic' : 'text-muted group-hover:text-ink'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Account Section & Logout */}
      <div className="p-3 border-t border-border space-y-1.5">
        {!collapsed && (
          <p className="px-2 pb-1 text-[11px] font-semibold text-muted/80 tracking-wider uppercase">
            Account
          </p>
        )}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`w-full flex items-center gap-2.5 p-2 rounded-btn transition-all text-left
            ${activeTab === 'profile' ? 'bg-white border border-border shadow-tactile-surface' : 'hover:bg-canvas/80 border border-transparent'}`}
        >
          <Avatar
            name={userProfile?.full_name || 'Student'}
            src={userProfile?.avatar_url}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink truncate">
                {userProfile?.full_name || 'Student'}
              </p>
              <p className="text-[11px] text-muted truncate">
                {userProfile?.department || 'Academic Member'}
              </p>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-btn text-xs font-medium text-muted hover:text-danger hover:bg-danger-50 border border-transparent hover:border-danger-100 transition-colors
            ${collapsed ? 'justify-center' : ''}`}
          title="Sign out of platform"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
