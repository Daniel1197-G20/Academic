import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileCheck2,
  UserRoundSearch,
  MessageSquare,
  Settings,
  Sparkles,
  BrainCircuit,
  PhoneCall,
  CalendarCheck,
  LibraryBig,
  TrendingUp,
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
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const [hasPositionedIndicator, setHasPositionedIndicator] = useState(false);

  // Several requested shortcuts lead to existing combined workspaces. Keep the
  // canonical route active so one destination never lights up multiple rows.
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, activeFor: ['dashboard', 'overview'] },
    { id: 'tutors', label: 'Find Tutor', icon: UserRoundSearch, activeFor: ['tutors'] },
    { id: 'study', label: 'Study', icon: BookOpen, activeFor: ['study'] },
    { id: 'cgpa', label: 'Courses', icon: GraduationCap, activeFor: ['cgpa'] },
    { id: 'study', label: 'Study Plan', icon: CalendarCheck, activeFor: [] },
    { id: 'ai', label: 'AI Study Coach', icon: BrainCircuit, activeFor: ['ai'] },
    { id: 'test-prep', label: 'Assessments', icon: FileCheck2, activeFor: ['test-prep', 'prep'] },
    { id: 'messages', label: 'Messages', icon: MessageSquare, activeFor: ['messages', 'community'], badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'messages', label: 'Calls', icon: PhoneCall, activeFor: [] },
    { id: 'dashboard', label: 'My Bookings', icon: CalendarCheck, activeFor: [] },
    { id: 'ai', label: 'Resources', icon: LibraryBig, activeFor: [] },
    { id: 'cgpa', label: 'Progress', icon: TrendingUp, activeFor: [] },
    { id: 'settings/subscription', label: 'Settings', icon: Settings, activeFor: ['settings/subscription', 'settings', 'settings-subscription'] },
    ...(isTutor ? [{ id: 'tutor-dashboard', label: 'Tutor Dashboard', icon: Sparkles, activeFor: ['tutor-dashboard'] }] : []),
  ];

  const positionIndicator = () => {
    const currentNav = navRef.current;
    if (!currentNav) return;
    const item = navItems.find((candidate) => candidate.activeFor.includes(activeTab));
    const button = item && currentNav.querySelector(`[data-nav-id="${item.id}"]`);
    if (!button) {
      setIndicator(null);
      return;
    }
    const navRect = currentNav.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    setIndicator({ top: buttonRect.top - navRect.top, height: buttonRect.height });
    setHasPositionedIndicator(true);
  };

  useLayoutEffect(() => {
    positionIndicator();
    const observer = typeof ResizeObserver !== 'undefined' && navRef.current
      ? new ResizeObserver(positionIndicator)
      : null;
    if (observer && navRef.current) observer.observe(navRef.current);
    window.addEventListener('resize', positionIndicator);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', positionIndicator);
    };
  }, [activeTab, collapsed, isTutor]);

  return (
    <aside
      className={`hidden xl:flex flex-col z-30 select-none sticky top-0 h-dvh shrink-0 overflow-y-auto no-scrollbar glass-sidebar transition-all duration-200 ease-in-out
        ${collapsed ? 'w-20' : 'w-[240px]'} ${className}`}
    >
      <div className="pt-6 pb-5 px-5">
        <div className="flex items-center gap-3">
          <div className="glass-sidebar-brand-mark w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm">
            <StudoraMark className="w-5 h-5" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="glass-sidebar-brand-name font-extrabold text-lg tracking-tight leading-tight font-sans">Studora</span>
              <span className="glass-sidebar-muted text-[9px] leading-none tracking-[0.12em] uppercase">Learn · Connect · Excel</span>
            </div>
          )}
        </div>
      </div>

      <nav ref={navRef} aria-label="Main navigation" className="relative flex flex-1 flex-col gap-2.5 px-3 py-2">
        {indicator && (
          <span
            aria-hidden="true"
            className={`glass-nav-indicator pointer-events-none absolute left-3 right-3 top-0 rounded-xl ${hasPositionedIndicator ? 'transition-[transform,height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none' : ''}`}
            style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }}
          />
        )}
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.activeFor.includes(activeTab);
          return (
            <button
              key={`${item.label}-${index}`}
              data-nav-id={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`glass-nav-item group relative z-10 flex h-10 min-h-10 w-full items-center gap-3 rounded-xl px-3 py-0 text-xs font-semibold transition-colors duration-200 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C]
                ${isActive ? 'is-active font-bold' : ''} motion-reduce:transition-none`}
            >
              <Icon className="glass-nav-icon w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge != null && (
                    <span className="glass-sidebar-badge text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-sm">{item.badge}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && !isPremium && (
        <div className="p-4 pt-2 mt-auto">
          <button
            type="button"
            onClick={() => onSelectTab('pricing')}
            className="glass-sidebar-upgrade w-full py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:brightness-105 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] motion-reduce:transition-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Premium</span>
          </button>
        </div>
      )}
    </aside>
  );
}
