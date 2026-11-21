import React from 'react';

/**
 * Lightweight brand splash shown while authentication is restored.
 */
export function AppSplashScreen({ 
  message = "Initializing Studora Workspace...", 
  subMessage = "Study smarter. Go further.",
  isFading = false 
}) {
  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F6F7F3] selection:bg-academic-100 selection:text-academic transition-opacity duration-300 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading Studora"
    >
      <div className="relative z-10 flex flex-col items-center px-4">
        <img src="/icons/studora-192.png" alt="" className="relative z-10 h-20 w-20 rounded-[22px] shadow-[0_12px_28px_rgba(23,107,77,0.24)]" />

        {/* Brand Lockup & Staged Message */}
        <div className="mt-6 text-center space-y-1">
          <h1 className="font-extrabold text-xl sm:text-2xl text-ink tracking-tight font-sans">
            Studora
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-muted font-bold">
            {subMessage}
          </p>
        </div>

        {/* Status text */}
        <p className="text-xs text-muted font-medium mt-3.5">
          {message}
        </p>
      </div>
    </div>
  );
}
