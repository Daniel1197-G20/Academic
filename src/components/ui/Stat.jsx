import React from 'react';
import { AnimatedNumber } from './AnimatedNumber';

export function Stat({
  label,
  value,
  secondaryValue,
  caption,
  trend, // { direction: 'up' | 'down', text: string }
  icon: Icon,
  animate = false,
  className = ''
}) {
  const isNumeric = typeof value === 'number';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted tracking-tight">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted shrink-0" />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-mono">
          {animate && isNumeric ? (
            <AnimatedNumber value={value} decimals={Number.isInteger(value) ? 0 : 2} />
          ) : (
            value
          )}
        </span>
        {secondaryValue && (
          <span className="text-xs sm:text-sm font-medium text-muted font-mono">
            {secondaryValue}
          </span>
        )}
      </div>
      {(caption || trend) && (
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <span className={`font-semibold ${trend.direction === 'up' ? 'text-academic' : 'text-danger'}`}>
              {trend.text}
            </span>
          )}
          {caption && <span className="text-muted">{caption}</span>}
        </div>
      )}
    </div>
  );
}
