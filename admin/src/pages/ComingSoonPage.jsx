import React from 'react';
import { Construction } from 'lucide-react';

/**
 * ComingSoonPage — placeholder for unimplemented admin modules.
 * Accepts a `title` prop.
 */
export function ComingSoonPage({ title = 'Module' }) {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="bg-surface rounded-card border border-border shadow-subtle flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <Construction className="w-10 h-10 text-muted" />
        <p className="text-base font-semibold text-ink">Coming Soon</p>
        <p className="text-sm text-muted max-w-xs">
          This module is not yet implemented. It will be available in a future phase.
        </p>
      </div>
    </div>
  );
}
