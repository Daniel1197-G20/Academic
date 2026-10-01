import React from 'react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-border rounded-card bg-white shadow-tactile-surface ${className}`}>
      {Icon && (
        <div className="w-11 h-11 rounded-btn bg-academic-100 border border-academic-200 flex items-center justify-center text-academic mb-3.5 shadow-tactile-surface">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-ink tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant={actionVariant} size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
