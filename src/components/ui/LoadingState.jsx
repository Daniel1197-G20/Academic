import React from 'react';
import { Loader2 } from 'lucide-react';

export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-[#E8EAE4] animate-pulse rounded-[10px] ${className}`} />
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
