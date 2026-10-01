import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'secondary', // 'primary' | 'secondary' | 'academic' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg' | 'icon'
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-btn transition-all duration-140 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-academic/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
    icon: "p-2 w-9 h-9"
  };

  const variantStyles = {
    secondary: "tactile-btn-secondary",
    academic: "tactile-btn-academic",
    primary: "tactile-btn-primary",
    outline: "bg-transparent text-ink border border-border hover:-translate-y-[1px] hover:bg-white/60 active:translate-y-[1px] active:bg-white/90",
    ghost: "bg-transparent text-muted hover:text-ink hover:bg-black/[0.03] active:translate-y-[1px]",
    danger: "bg-danger-50 text-danger border border-danger-100 hover:-translate-y-[1px] hover:bg-danger-100/80 active:translate-y-[1px] active:shadow-[inset_1px_1px_2px_rgba(194,65,65,0.15)]"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.secondary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
}
