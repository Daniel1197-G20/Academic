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
  const mainNav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'cgpa', label: 'CGPA', icon: GraduationCap },
    { id: 'study', label: 'Study Planner', icon: BookOpen },
    { id: 'prep', label: 'Test Prep', icon: FileCheck2, badge: 'Soon', isFuture: true },
    { id: 'tutors', label: 'Tutors', icon: Compass, badge: 'Soon', isFuture: true },
    { id: 'community', label: 'Messages', icon: MessageSquare, badge: 'Soon', isFuture: true },
  ];

  const personalNav = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy-settings', label: 'Privacy', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-white border-r border-border transition-all duration-200 ease-in-out z-30 select-none
        ${collapsed ? 'w-16' : 'w-60'} ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-academic-100 flex items-center justify-center text-academic shrink-0 border border-academic-200/50">
              <GraduationCap className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-ink">
                  Academic
                </span>
                <span className="text-[10px] text-muted tracking-tight">
                  Student Platform
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
              const isActive = activeTab === item.id || (item.id === 'dashboard' && activeTab === 'overview');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left group
                    ${isActive
                      ? 'bg-academic-50 text-academic font-semibold'
                      : 'text-gray-600 hover:text-ink hover:bg-gray-50'}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-academic' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
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
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left group
                    ${isActive
                      ? 'bg-academic-50 text-academic font-semibold'
                      : 'text-gray-600 hover:text-ink hover:bg-gray-50'}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-academic' : 'text-gray-400 group-hover:text-gray-600'}`} />
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
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left
            ${activeTab === 'profile' ? 'bg-academic-50' : 'hover:bg-gray-50'}`}
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
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-danger hover:bg-danger-50 transition-colors
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
