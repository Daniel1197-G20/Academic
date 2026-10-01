import React from 'react';

export function Card({
  children,
  variant = 'default', // 'default' | 'flat' | 'interactive' | 'subtle'
  className = '',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: "bg-white border border-border rounded-card shadow-tactile-raised",
    raised: "bg-white border border-border rounded-card shadow-tactile-raised",
    hero: "bg-white border border-border rounded-hero shadow-tactile-hero",
    surface: "bg-white border border-border rounded-card shadow-tactile-surface",
    flat: "bg-white border border-border rounded-card shadow-tactile-surface",
    subtle: "bg-surface-subtle border border-border-subtle rounded-card",
    interactive: "bg-white border border-border rounded-card shadow-tactile-raised cursor-pointer hover:-translate-y-[1px] hover:shadow-tactile-raised-hover transition-all duration-150 active:translate-y-0"
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex flex-col space-y-1 pb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-sm sm:text-base font-semibold text-ink tracking-tight flex items-center justify-between ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-xs sm:text-sm text-muted leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-3 border-t border-border flex items-center justify-between gap-3 text-xs ${className}`}>
      {children}
    </div>
  );
}
