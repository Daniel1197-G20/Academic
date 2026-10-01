import React, { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * TactileCheckbox
 * Implements the 5-step physical tactile feedback sequence:
 * 1. User presses
 * 2. Checkbox compresses (~120ms)
 * 3. Checkmark appears
 * 4. Checkbox expands slightly (~140ms)
 * 5. Settles back to rest while triggering onChange
 * Total duration: ~400-500ms
 */
export function TactileCheckbox({
  checked = false,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  title
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle' | 'compress' | 'expand'

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled || isAnimating) return;

    // Check for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onChange && onChange(!checked);
      return;
    }

    setIsAnimating(true);
    setAnimationPhase('compress');

    // Phase 1: Compress (120ms)
    setTimeout(() => {
      setAnimationPhase('expand');
      // Phase 2: Expand & toggle state (140ms)
      setTimeout(() => {
        onChange && onChange(!checked);
        setAnimationPhase('idle');
        setIsAnimating(false);
      }, 160);
    }, 120);
  };

  const getTransformClass = () => {
    if (animationPhase === 'compress') return 'scale-90 shadow-tactile-btn-press';
    if (animationPhase === 'expand') return 'scale-105';
    return 'scale-100';
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={handleClick}
      className={`relative w-5 h-5 rounded-[6px] shrink-0 transition-transform duration-120 ease-out select-none flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-academic/40 ${getTransformClass()} ${
        checked
          ? 'bg-academic text-white border border-[#13583F] shadow-[0_1px_2px_rgba(23,107,77,0.3)]'
          : 'bg-white border border-border shadow-tactile-inset-sm hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <Check
        className={`w-3.5 h-3.5 stroke-[2.5] transition-opacity duration-150 ${
          checked ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  );
}
