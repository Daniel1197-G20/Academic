import React from 'react';

/**
 * CampusBackground — Faithful implementation using the authentic campus photograph:
 * "src/images/Modern University Campus in Daylight.png"
 *
 * Implements the signature soft cutout and fade effect:
 * - Positioned behind upper dashboard content
 * - University building on the upper right
 * - Soft radial and linear feathered gradient fade blending seamlessly
 *   into the light canvas surface (#F6F7F3)
 * - Dark mode support with deep navy / emerald overlay
 */
export function CampusBackground({ className = '' }) {
  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Background canvas fill */}
      <div className="absolute inset-0 bg-[#F6F7F3] dark:bg-[#0c1913] transition-colors duration-500" />

      {/* The authentic campus photograph layer */}
      <div
        className="absolute top-0 right-0 w-full h-[460px] sm:h-[540px] md:h-[640px] lg:h-[720px] transition-all duration-700"
        style={{
          backgroundImage: `image-set(url('/campus-background.webp') type('image/webp'), url('/campus-background.png') type('image/png'))`,
          backgroundPosition: 'right 20% top 15%',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: `
            radial-gradient(ellipse 90% 75% at 75% 15%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.3) 75%, transparent 100%),
            linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.35) 70%, transparent 95%),
            linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,1) 40%)
          `,
          maskImage: `
            radial-gradient(ellipse 90% 75% at 75% 15%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.3) 75%, transparent 100%),
            linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.35) 70%, transparent 95%),
            linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,1) 40%)
          `,
          WebkitMaskComposite: 'destination-in',
          maskComposite: 'intersect',
        }}
      />

      {/* Soft translucent atmospheric wash blending campus photo into canvas */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#F6F7F3]/20 via-[#F6F7F3]/60 to-[#F6F7F3] dark:from-[#0c1913]/40 dark:via-[#0c1913]/70 dark:to-[#0c1913]"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
