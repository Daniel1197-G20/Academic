import React from 'react';

export function Avatar({
  name = 'Student',
  src = null,
  size = 'md',
  className = '',
  border = true
}) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-20 h-20 text-xl font-bold'
  };

  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'ST';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  if (src && typeof src === 'string' && src.trim() !== '') {
    return (
      <img
        src={src}
        alt={`${name}'s avatar`}
        className={`rounded-xl object-cover shrink-0 select-none ${sizeClasses[size] || sizeClasses.md} ${
          border ? 'border border-ghost-200/25 shadow-neu-raised-sm' : ''
        } ${className}`}
        onError={(e) => {
          // If image fails to load, suppress broken icon and let initials render
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      aria-label={`${name}'s avatar`}
      className={`rounded-xl bg-[#0E1216] text-ghost-200 font-mono font-semibold flex items-center justify-center shrink-0 select-none ${
        sizeClasses[size] || sizeClasses.md
      } ${border ? 'border border-ghost-200/25 shadow-neu-raised-sm' : ''} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}
