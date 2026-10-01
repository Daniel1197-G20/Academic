import React from 'react';

/**
 * Studora Brand Mark
 * Minimalist geometric academic mark combining an open book and forward progression
 * forming a continuous stylized "S". Scales crisply from 16px to 64px.
 */
export function StudoraMark({ className = "w-6 h-6", strokeWidth = 2.2 }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-hidden="true"
    >
      {/* Top arc & forward loop */}
      <path 
        d="M4.5 7.5C4.5 5.567 6.067 4 8 4H14C17.314 4 20 6.686 20 10C20 13.314 17.314 16 14 16H9.5" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Bottom arc & base loop */}
      <path 
        d="M19.5 16.5C19.5 18.433 17.933 20 16 20H10C6.686 20 4 17.314 4 14C4 10.686 6.686 8 10 8H14.5" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Subtle upward trajectory tick */}
      <path 
        d="M12 4.5L14 2.5L16 4.5" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="opacity-80"
      />
    </svg>
  );
}

/**
 * Studora Complete Logo Lockup
 * Includes mark, wordmark, and optional tagline
 */
export function StudoraLogo({ 
  size = 'md', 
  showWordmark = true, 
  showTagline = false,
  variant = 'default',
  className = '' 
}) {
  const sizeMap = {
    sm: { icon: 'w-4 h-4', box: 'w-7 h-7 rounded-lg', text: 'text-sm', tag: 'text-[9px]' },
    md: { icon: 'w-5 h-5', box: 'w-9 h-9 rounded-xl', text: 'text-base', tag: 'text-[10px]' },
    lg: { icon: 'w-7 h-7', box: 'w-12 h-12 rounded-2xl', text: 'text-xl', tag: 'text-xs' },
    xl: { icon: 'w-9 h-9', box: 'w-16 h-16 rounded-[22px]', text: 'text-2xl', tag: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const boxStyles = {
    default: 'bg-academic-100 border border-academic-200/80 text-academic shadow-tactile-surface',
    solid: 'bg-academic text-white shadow-tactile-btn',
    canvas: 'bg-white border border-border text-academic shadow-tactile-surface',
    minimal: 'text-academic'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon Tile */}
      <div className={`flex items-center justify-center shrink-0 transition-transform ${currentSize.box} ${boxStyles[variant] || boxStyles.default}`}>
        <StudoraMark className={currentSize.icon} />
      </div>

      {/* Wordmark and Optional Tagline */}
      {showWordmark && (
        <div className="flex flex-col min-w-0 leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight text-ink font-sans ${currentSize.text}`}>
              Studora
            </span>
          </div>
          {showTagline && (
            <span className={`text-muted font-medium tracking-normal mt-0.5 ${currentSize.tag}`}>
              Study smarter. Go further.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StudoraLogo;
