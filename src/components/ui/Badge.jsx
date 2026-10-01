import React from 'react';

export function Badge({
  children,
  variant = 'academic', // 'academic' | 'ghost' | 'neutral' | 'success' | 'warning' | 'danger' | 'gold'
  size = 'md', // 'sm' | 'md'
  className = '',
  icon: Icon
}) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5"
  };

  const variantStyles = {
    academic: "bg-academic-100 text-academic font-semibold border border-academic-200 shadow-tactile-surface",
    ghost: "bg-academic-100 text-academic font-semibold border border-academic-200 shadow-tactile-surface",
    neutral: "bg-[#ECEEE9] text-ink font-medium border border-border shadow-tactile-surface",
    success: "bg-academic-100 text-academic font-semibold border border-academic-200 shadow-tactile-surface",
    warning: "bg-warning-50 text-warning font-semibold border border-warning-100 shadow-tactile-surface",
    danger: "bg-danger-50 text-danger font-semibold border border-danger-100 shadow-tactile-surface",
    gold: "bg-gold-50 text-gold-700 font-semibold border border-gold-200 shadow-tactile-surface"
  };

  return (
    <span className={`inline-flex items-center rounded-[8px] select-none tracking-tight ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.neutral} ${className}`}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
