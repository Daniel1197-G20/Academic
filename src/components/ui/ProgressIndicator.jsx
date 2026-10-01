import React from 'react';

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showPercentage = true,
  className = '',
  size = 'md' // 'sm' | 'md' | 'lg'
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5'
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          {label && <span>{label}</span>}
          {showPercentage && <span className="font-mono text-ghost-200">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#080A0C] border border-white/[0.04] rounded-full overflow-hidden neu-inset ${heights[size]}`}>
        <div 
          className="h-full bg-gradient-to-r from-ghost-400 to-ghost-200 rounded-full transition-all duration-300 ease-out shadow-ghost-glow"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value = 0,
  max = 100,
  size = 80,
  strokeWidth = 6,
  className = '',
  children
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated indicator circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#D7FFE0"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
          style={{ filter: 'drop-shadow(0 0 6px rgba(215, 255, 224, 0.4))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children || <span className="font-mono font-bold text-xs sm:text-sm text-zinc-100">{percentage}%</span>}
      </div>
    </div>
  );
}
