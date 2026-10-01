import React from 'react';

export function Badge({
  children,
  variant = 'ghost', // 'ghost' | 'neutral' | 'success' | 'warning' | 'danger'
  size = 'md', // 'sm' | 'md'
  className = '',
  icon: Icon
}) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5"
  };

  const variantStyles = {
    ghost: "bg-ghost-200/10 text-ghost-200 border border-ghost-200/25",
    neutral: "bg-zinc-800/60 text-zinc-300 border border-zinc-700/50",
    success: "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-950/40 text-amber-300 border border-amber-500/30",
    danger: "bg-red-950/40 text-red-300 border border-red-500/30"
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full tracking-wide select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
