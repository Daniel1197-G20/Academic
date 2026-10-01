import React from 'react';
import { Flame, Bell, GraduationCap } from 'lucide-react';
import { Avatar } from '../ui';

export function TopHeader({
  userProfile,
  cgpaMetrics,
  streakDays = 0,
  onOpenProfile,
  activeTabTitle
}) {
  return (
    <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Active Page Title & Institution */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-ink tracking-tight truncate">
            {activeTabTitle || 'Overview'}
          </h1>
          <p className="text-[11px] text-muted truncate hidden sm:block">
            {userProfile?.institution || 'Apex Institute of Technology'} • {userProfile?.academic_level || 'Undergraduate'}
          </p>
        </div>
      </div>

      {/* Right: Academic Status Badges & Quick Stats */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Streak Pill */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-50 border border-gold-200 text-gold-700 text-xs font-medium"
          title={`${streakDays} consecutive days of study`}
        >
          <Flame className="w-3.5 h-3.5 text-gold-600 fill-gold-600 shrink-0" />
          <span>{streakDays}d Streak</span>
        </div>

        {/* CGPA Badge */}
        {cgpaMetrics && (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-academic-50 border border-academic-200 text-academic text-xs font-semibold"
            title="Cumulative Grade Point Average"
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>{cgpaMetrics.cgpa.toFixed(2)} CGPA</span>
          </div>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-lg text-gray-500 hover:text-ink hover:bg-gray-100 transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar Trigger on Mobile */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="md:hidden flex items-center shrink-0 ml-1"
          title="Open Profile"
          aria-label="Open Profile"
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
