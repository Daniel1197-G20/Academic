import React from 'react';

export function Card({
  children,
  variant = 'neu', // 'neu' | 'glass' | 'flat' | 'interactive'
  className = '',
  onClick,
  ...props
}) {
  const variantStyles = {
    neu: "bg-[#090B0D] border border-white/[0.04] shadow-neu-raised rounded-2xl",
    glass: "liquid-glass rounded-2xl",
    flat: "bg-[#0A0C0E] border border-white/[0.04] rounded-2xl",
    interactive: "bg-[#090B0D] border border-white/[0.04] shadow-neu-raised rounded-2xl cursor-pointer hover:-translate-y-0.5 hover:border-ghost-200/20 hover:shadow-glass-rim transition-all duration-200"
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex flex-col space-y-1.5 pb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base sm:text-lg font-semibold text-zinc-100 tracking-tight flex items-center justify-between ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-xs sm:text-sm text-zinc-400 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 border-t border-white/[0.04] flex items-center justify-between gap-3 ${className}`}>
      {children}
    </div>
  );
}
