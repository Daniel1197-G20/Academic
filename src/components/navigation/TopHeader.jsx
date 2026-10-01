import React from 'react';
import { Flame, Bell, GraduationCap, Sparkles } from 'lucide-react';
import { Avatar } from '../ui';
import { useBilling } from '../../context/BillingContext';

export function TopHeader({
  userProfile,
  cgpaMetrics,
  streakDays = 0,
  onOpenProfile,
  onOpenPricing,
  onOpenSubscription,
  activeTabTitle
}) {
  const { subscription, isPremium } = useBilling();

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
        {/* Subscription Plan Badge */}
        <button
          type="button"
          onClick={onOpenSubscription || onOpenPricing}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn text-xs font-semibold shadow-tactile-surface transition-all select-none
            ${isPremium
              ? 'bg-academic-100 text-academic border border-academic-200 hover:bg-academic-200/50'
              : 'bg-canvas text-ink border border-border hover:bg-white'}`}
          title="Manage Subscription & Entitlements"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isPremium ? 'text-academic' : 'text-gold-600'}`} />
          <span>{subscription?.planName || 'Basic'}</span>
        </button>
        {/* Streak Pill - Breathing Tactile Element */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1 rounded-btn bg-gold-50 border border-gold-200 text-gold-700 text-xs font-medium shadow-tactile-surface streak-breathing select-none"
          title={`${streakDays} consecutive days of study`}
        >
          <Flame className="w-3.5 h-3.5 text-gold-600 fill-gold-600 shrink-0" />
          <span className="font-mono font-semibold">{streakDays}d</span>
          <span className="hidden sm:inline">Streak</span>
        </div>

        {/* CGPA Badge */}
        {cgpaMetrics && (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-btn bg-academic-100 border border-academic-200 text-academic text-xs font-semibold shadow-tactile-surface select-none"
            title="Cumulative Grade Point Average"
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono">{cgpaMetrics.cgpa.toFixed(2)}</span>
            <span>CGPA</span>
          </div>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-btn text-muted hover:text-ink hover:bg-canvas border border-transparent hover:border-border hover:shadow-tactile-surface transition-all active:translate-y-[1px]"
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
