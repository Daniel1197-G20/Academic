import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * AppSplashScreen
 * Premium animated brand splash screen displayed when a visitor enters the website.
 * Features an extruded academic icon tile, concentric pulsing ripple rings, 
 * floating micro-motion, metallic light sheen sweep, and an indeterminate progress bar.
 */
export function AppSplashScreen({ 
  message = "Initializing Academic Workspace...", 
  subMessage = "University Academic Productivity",
  isFading = false 
}) {
  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F6F7F3] selection:bg-academic-100 selection:text-academic transition-opacity duration-300 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading Academic Platform"
    >
      {/* Ambient background glow */}
      <div 
        className="absolute w-80 h-80 rounded-full bg-academic-100/60 blur-3xl pointer-events-none -translate-y-4" 
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Animated App Icon Lockup */}
        <div className="relative flex items-center justify-center">
          {/* Concentric pulsing ripple ring 1 */}
          <div className="absolute w-24 h-24 rounded-[30px] bg-academic/15 animate-pulse-halo" />
          
          {/* Concentric pulsing ripple ring 2 */}
          <div className="absolute w-28 h-28 rounded-[34px] bg-academic/10 animate-pulse-halo [animation-delay:400ms]" />

          {/* Core App Icon Tile */}
          <div className="relative w-20 h-20 rounded-[22px] bg-gradient-to-br from-[#176B4D] via-[#145d43] to-[#0E3D2C] shadow-[0_12px_28px_rgba(23,107,77,0.32),0_4px_12px_rgba(0,0,0,0.06)] border border-white/25 flex items-center justify-center text-white overflow-hidden animate-icon-float">
            {/* Glossy metallic light sheen sweep across the cap */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-12 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 animate-icon-sheen" />
            </div>

            {/* Crisp Graduation Cap Icon */}
            <GraduationCap className="w-10 h-10 text-white stroke-[2.2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
          </div>
        </div>

        {/* Brand Lockup & Staged Message */}
        <div className="mt-6 text-center space-y-1">
          <h1 className="font-extrabold text-xl sm:text-2xl text-ink tracking-tight">
            Academic Platform
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-muted font-bold">
            {subMessage}
          </p>
        </div>

        {/* Indeterminate Sleek Progress Rail */}
        <div className="mt-5 w-44 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden relative shadow-inner">
          <div className="absolute top-0 bottom-0 w-24 rounded-full bg-gradient-to-r from-academic-600 via-academic-400 to-academic-700 animate-bar-indeterminate" />
        </div>

        {/* Status text */}
        <p className="text-xs text-muted font-medium mt-3.5 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
