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
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-16 h-16 text-lg font-bold'
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
        className={`rounded-full object-cover shrink-0 select-none ${sizeClasses[size] || sizeClasses.md} ${
          border ? 'border border-border shadow-subtle' : ''
        } ${className}`}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      aria-label={`${name}'s avatar`}
      className={`rounded-full bg-academic-100 text-academic font-sans font-bold flex items-center justify-center shrink-0 select-none ${
        sizeClasses[size] || sizeClasses.md
      } ${border ? 'border border-academic-200/60' : ''} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}
