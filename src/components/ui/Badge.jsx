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
    academic: "bg-academic-100 text-academic font-semibold border border-academic-200/60",
    ghost: "bg-academic-100 text-academic font-semibold border border-academic-200/60",
    neutral: "bg-gray-100 text-gray-700 font-medium border border-gray-200",
    success: "bg-academic-100 text-academic font-semibold border border-academic-200/60",
    warning: "bg-warning-50 text-warning font-semibold border border-warning-100",
    danger: "bg-danger-50 text-danger font-semibold border border-danger-100",
    gold: "bg-gold-50 text-gold-700 font-semibold border border-gold-200"
  };

  return (
    <span className={`inline-flex items-center rounded-md select-none tracking-tight ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.neutral} ${className}`}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}
