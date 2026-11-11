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
  Bell,
  HelpCircle,
  CreditCard,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { StudoraMark } from '../ui';
import { useBilling } from '../../context/BillingContext';

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
  userProfile,
  onLogout,
  unreadMessages = 0,
  unreadNotifications = 0,
  className = ''
}) {
  const isTutor = userProfile?.role === 'tutor';
  const { isPremium } = useBilling();

  // Navigation Items matching the official reference screenshot:
  // 1. Dashboard
  // 2. Profile
  // 3. Find Tutor
  // 4. Chat & Calls
  // 5. My Courses
  // 6. Study Plans
  // 7. Assessments
  // 8. Payments
  // 9. Notifications
  // 10. Settings
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isTutor ? [{ id: 'tutor-dashboard', label: 'Tutor Dashboard', icon: Sparkles }] : []),
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'tutors', label: 'Find Tutor', icon: Compass },
    { id: 'messages', label: 'Chat & Calls', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'cgpa', label: 'My Courses', icon: GraduationCap },
    { id: 'study', label: 'Study Plans', icon: BookOpen },
    { id: 'test-prep', label: 'Assessments', icon: FileCheck2 },
    { id: 'settings/subscription', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : null },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col z-30 select-none sticky top-0 h-screen shrink-0 overflow-y-auto no-scrollbar glass-sidebar transition-all duration-200 ease-in-out
        ${collapsed ? 'w-20' : 'w-[240px]'} ${className}`}
    >
      {/* Top Branding matching the official reference */}
      <div className="pt-6 pb-4 px-5">
        <div className="flex items-center gap-3">
          {/* Studora Green Octagonal / Shield Icon */}
          <div className="w-10 h-10 rounded-xl bg-academic-100 dark:bg-[#176B4D]/30 border border-academic-200/60 dark:border-[#176B4D]/40 flex items-center justify-center shrink-0 shadow-sm text-academic">
            <StudoraMark className="w-5 h-5" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-lg tracking-tight text-ink dark:text-white leading-tight font-sans">
                Studora
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.id === 'dashboard' && (activeTab === 'dashboard' || activeTab === 'overview')) ||
            (item.id === 'profile' && activeTab === 'profile') ||
            (item.id === 'tutors' && activeTab === 'tutors') ||
            (item.id === 'messages' && (activeTab === 'messages' || activeTab === 'community')) ||
            (item.id === 'cgpa' && activeTab === 'cgpa') ||
            (item.id === 'study' && activeTab === 'study') ||
            (item.id === 'test-prep' && (activeTab === 'test-prep' || activeTab === 'prep')) ||
            (item.id === 'settings/subscription' && (activeTab === 'settings/subscription' || activeTab === 'billing-callback')) ||
            (item.id === 'notifications' && activeTab === 'notifications') ||
            (item.id === 'settings' && activeTab === 'settings') ||
            activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left
                ${isActive
                  ? 'bg-[#DDEFE5] text-[#176B4D] dark:bg-[#176B4D]/30 dark:text-[#A7F3D0] dark:border dark:border-[#176B4D]/40 shadow-sm font-bold'
                  : 'text-[#111827] dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#176B4D] dark:text-[#A7F3D0]' : 'text-[#667085] dark:text-white/60'}`} />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444] text-white min-w-[18px] text-center leading-none shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Upgrade to Premium Pill Button at bottom */}
      {!collapsed && !isPremium && (
        <div className="p-4 pt-2">
          <button
            type="button"
            onClick={() => onSelectTab('pricing')}
            className="w-full py-2.5 px-3 rounded-xl bg-[#F6E6C2] dark:bg-[#C89B3C]/20 border border-[#C89B3C]/40 text-[#78350F] dark:text-[#FDE68A] text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:brightness-105 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C89B3C]" />
            <span>Upgrade to Premium</span>
          </button>
        </div>
      )}
    </aside>
  );
}
