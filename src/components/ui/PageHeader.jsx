import React from 'react';

export function PageHeader({
  title,
  description,
  actions,
  badge,
  useSerif = false,
  className = ''
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 ${className}`}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight text-ink ${useSerif ? 'font-serif text-2xl sm:text-3xl' : ''}`}>
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
