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
    <header className="h-16 bg-[#07080A]/80 backdrop-blur-md border-b border-white/[0.05] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Active Page Title & Institution */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight truncate">
            {activeTabTitle || 'Academic Dashboard'}
          </h1>
          <p className="text-[11px] text-zinc-500 font-mono truncate hidden sm:block">
            {userProfile?.institution || 'Apex Institute of Technology'} • {userProfile?.academic_level || 'Undergraduate'}
          </p>
        </div>
      </div>

      {/* Right: Academic Status Badges & Quick Stats */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Streak Pill */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-950/20 border border-orange-500/20 text-orange-300 text-xs font-medium"
          title={`${streakDays} consecutive days of academic study`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0 animate-pulse-subtle" />
          <span className="font-mono">{streakDays}d Streak</span>
        </div>

        {/* CGPA Badge */}
        {cgpaMetrics && (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-ghost-200/10 border border-ghost-200/25 text-ghost-200 text-xs font-medium shadow-ghost-glow"
            title="Cumulative Grade Point Average"
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono font-bold">{cgpaMetrics.cgpa.toFixed(2)}</span>
            <span className="text-[10px] text-zinc-400 font-mono">CGPA</span>
          </div>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-xl text-zinc-400 hover:text-ghost-200 hover:bg-white/[0.04] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ghost-200 shadow-ghost-glow" />
        </button>

        {/* Avatar Trigger on Mobile */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="md:hidden flex items-center shrink-0"
          title="Open Profile"
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
