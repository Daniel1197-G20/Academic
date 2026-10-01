import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber
 * Smoothly counts up to a target number when data loads or changes.
 * Restrained duration (700-900ms) with ease-out curve.
 * Respects prefers-reduced-motion.
 */
export function AnimatedNumber({
  value = 0,
  decimals = 2,
  duration = 800,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);
  const prevValueRef = useRef(numericValue);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(numericValue);
      prevValueRef.current = numericValue;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = numericValue;
    
    // If negligible difference, avoid animating
    if (Math.abs(endValue - startValue) < 0.001) {
      setDisplayValue(endValue);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Precision ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = startValue + (endValue - startValue) * easeProgress;
      
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericValue, duration]);

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}
