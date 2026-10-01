import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'secondary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
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
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-200/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
    icon: "p-2 w-9 h-9"
  };

  const variantStyles = {
    primary: "bg-ghost-200 text-zero font-semibold shadow-ghost-glow hover:bg-white active:bg-ghost-300",
    secondary: "bg-[#0E1114] text-zinc-200 border border-ghost-200/10 shadow-neu-raised-sm hover:border-ghost-200/25 hover:text-white hover:bg-[#12161A]",
    outline: "bg-transparent text-ghost-200 border border-ghost-200/30 hover:bg-ghost-200/10 hover:border-ghost-200/60 active:bg-ghost-200/15",
    ghost: "bg-transparent text-zinc-400 hover:text-ghost-200 hover:bg-white/[0.04]",
    danger: "bg-red-950/40 text-red-200 border border-red-500/20 hover:bg-red-900/50 hover:border-red-500/40"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
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
