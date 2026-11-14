import React, { useState } from 'react';
import { Bell, Sun, Moon, Search } from 'lucide-react';
import { Avatar, StudoraMark } from '../ui';

export function TopHeader({
  userProfile,
  cgpaMetrics,
  streakDays = 0,
  unreadNotifications = 0,
  onOpenProfile,
  onOpenPricing,
  onOpenSubscription,
  onOpenNotifications,
  activeTabTitle,
  isDark,
  onToggleDark,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const notifCount = Number(unreadNotifications) || 0;

  return (
    <header className="sticky top-0 z-30 px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-5 pb-2.5 sm:pb-3 flex items-center justify-between gap-3 sm:gap-4 pointer-events-auto bg-[#F6F7F3]/80 dark:bg-[#0a1510]/80 backdrop-blur-md transition-colors duration-200">
      {/* Search Input Bar (rounded pill with search icons on both ends) */}
      <div className="flex-1 max-w-lg min-w-0">
        <div className="glass-search-input rounded-full px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 transition-all">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#667085] shrink-0" />
          <input
            type="text"
            placeholder="Search for tutors, courses, or anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#111827] dark:text-white placeholder-[#667085]/70 outline-none font-sans min-w-0"
          />
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#667085]/60 shrink-0 hover:text-[#111827] cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Right Controls: Notification Bell with Badge & Theme Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-10 h-10 rounded-full glass-icon-btn flex items-center justify-center text-[#111827] dark:text-white transition-all shadow-sm"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF4444] rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
              {notifCount}
            </span>
          )}
        </button>

        {/* Theme Toggle (Moon / Sun) */}
        {onToggleDark && (
          <button
            type="button"
            onClick={onToggleDark}
            className="w-10 h-10 rounded-full glass-icon-btn flex items-center justify-center text-[#111827] dark:text-white transition-all shadow-sm"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Profile control remains visible on tablet and desktop. */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="hidden md:flex items-center gap-2.5 rounded-full border border-white/70 bg-white/75 dark:bg-white/10 px-2.5 py-1.5 shadow-sm backdrop-blur-md hover:bg-white dark:hover:bg-white/15 transition-colors"
          title="Open profile"
          aria-label="Open profile"
        >
          <Avatar
            name={userProfile?.full_name || 'Student'}
            src={userProfile?.avatar_url}
            size="sm"
          />
          <span className="hidden lg:block max-w-36 text-left">
            <span className="block truncate text-xs font-bold text-ink dark:text-white">{userProfile?.full_name || 'Student'}</span>
            <span className="block text-[10px] text-muted dark:text-white/60">{userProfile?.role || 'Student'}</span>
          </span>
        </button>

        {/* Mobile Avatar Trigger */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="md:hidden relative w-9 h-9 flex items-center justify-center shrink-0"
          title="Profile"
          aria-label="Open profile"
        >
          <Avatar
            name={userProfile?.full_name || 'Student'}
            src={userProfile?.avatar_url}
            size="sm"
          />
        </button>
      </div>
    </header>
  );
}
