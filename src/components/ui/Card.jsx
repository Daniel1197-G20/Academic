import React from 'react';

export function Card({
  children,
  variant = 'default', // 'default' | 'flat' | 'interactive' | 'subtle'
  className = '',
  onClick,
  ...props
}) {
  const variantStyles = {
    default: "bg-white dark:bg-[#0e1b15]/85 border border-border dark:border-white/10 rounded-card shadow-tactile-raised text-ink dark:text-white backdrop-blur-md",
    raised: "bg-white dark:bg-[#102019]/85 border border-border dark:border-white/10 rounded-card shadow-tactile-raised text-ink dark:text-white backdrop-blur-md",
    hero: "bg-white dark:bg-[#0e1b15]/90 border border-border dark:border-white/10 rounded-hero shadow-tactile-hero text-ink dark:text-white backdrop-blur-md",
    surface: "bg-white dark:bg-[#0e1b15]/80 border border-border dark:border-white/10 rounded-card shadow-tactile-surface text-ink dark:text-white backdrop-blur-md",
    flat: "bg-white dark:bg-[#0e1b15]/80 border border-border dark:border-white/10 rounded-card shadow-tactile-surface text-ink dark:text-white backdrop-blur-md",
    subtle: "bg-surface-subtle dark:bg-white/5 border border-border-subtle dark:border-white/10 rounded-card text-ink dark:text-white",
    interactive: "bg-white dark:bg-[#102019]/85 border border-border dark:border-white/10 rounded-card shadow-tactile-raised cursor-pointer hover:-translate-y-[1px] hover:shadow-tactile-raised-hover transition-all duration-150 active:translate-y-0 text-ink dark:text-white backdrop-blur-md"
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
    <h3 className={`text-sm sm:text-base font-semibold text-ink dark:text-white tracking-tight flex items-center justify-between ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-xs sm:text-sm text-muted dark:text-white/70 leading-relaxed ${className}`}>
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
    <div className={`pt-3 border-t border-border dark:border-white/10 flex items-center justify-between gap-3 text-xs ${className}`}>
      {children}
    </div>
  );
}
