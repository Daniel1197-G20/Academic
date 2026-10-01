import React from 'react';
import { Loader2 } from 'lucide-react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-white/[0.04] animate-pulse rounded-xl ${className}`} />
  );
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center p-4 text-ghost-200 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin`} />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="neu-card p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
