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
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-[10px] transition-colors duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-academic/40 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
    icon: "p-2 w-9 h-9"
  };

  const variantStyles = {
    // Primary: Deep Ink or Academic Green
    primary: "bg-ink text-white hover:bg-navy shadow-sm active:bg-ink-950",
    academic: "bg-academic text-white hover:bg-academic-700 shadow-sm active:bg-academic-800",
    secondary: "bg-white text-ink border border-border shadow-subtle hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100",
    outline: "bg-transparent text-ink border border-border hover:bg-gray-50 active:bg-gray-100",
    ghost: "bg-transparent text-muted hover:text-ink hover:bg-gray-100/70",
    danger: "bg-danger-50 text-danger border border-danger-100 hover:bg-danger-100/80 active:bg-danger-100"
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
