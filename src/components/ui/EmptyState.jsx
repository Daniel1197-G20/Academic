import React from 'react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-white/[0.08] rounded-2xl bg-[#07080A] ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-ghost-200/10 border border-ghost-200/20 flex items-center justify-center text-ghost-200 mb-4 shadow-ghost-glow">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-zinc-100 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
