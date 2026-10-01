import React from 'react';
import { StudoraMark } from '../ui';

export function PageLoader({ message = 'Loading Studora...' }) {
  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 select-none" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-xl bg-academic-100 flex items-center justify-center text-academic animate-pulse border border-academic-200/50 shadow-tactile-surface">
        <StudoraMark className="w-6 h-6" />
      </div>
      <p className="text-xs font-semibold text-muted mt-3 animate-pulse">
        {message}
      </p>
    </div>
  );
}
