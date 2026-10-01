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
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full space-y-1 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs text-muted">
          {label && <span className="font-medium text-ink">{label}</span>}
          {showPercentage && <span className="font-mono text-ink font-semibold">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full tactile-track ${heights[size]}`}>
        <div 
          className="h-full bg-academic rounded-track transition-all duration-400 ease-out"
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
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated indicator circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#176B4D"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children || <span className="font-mono font-semibold text-xs sm:text-sm text-ink">{percentage}%</span>}
      </div>
    </div>
  );
}
