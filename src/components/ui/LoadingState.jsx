import React from 'react';
import { Loader2 } from 'lucide-react';

export function Skeleton({ className = '', rounded = 'rounded-[10px]' }) {
  return (
    <div className={`bg-[#E8EAE4] dark:bg-white/10 animate-pulse ${rounded} ${className}`} aria-hidden="true" />
  );
}

export function TutorCardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col items-center text-center justify-between border border-white/60 dark:border-white/5 space-y-4">
      <Skeleton className="w-20 h-20" rounded="rounded-full" />
      <div className="space-y-2 w-full flex flex-col items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-2 w-full justify-center">
        <Skeleton className="h-5 w-16" rounded="rounded-full" />
        <Skeleton className="h-5 w-16" rounded="rounded-full" />
      </div>
      <Skeleton className="h-9 w-full mt-2" rounded="rounded-xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard...">
      <div className="glass-panel rounded-2xl p-6 h-36 bg-gray-100 dark:bg-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel rounded-2xl p-5 h-28 bg-gray-100 dark:bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-72 bg-gray-100 dark:bg-white/5" />
        <div className="glass-panel rounded-2xl p-6 h-72 bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  };

  return (
    <div className={`flex items-center justify-center p-3 text-academic ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin`} />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-card p-5 space-y-3 shadow-tactile-raised">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-btn" />
        <Skeleton className="h-8 w-24 rounded-btn" />
      </div>
    </div>
  );
}
