import React, { useRef, useState, useEffect } from 'react';

/**
 * Tabs - Physical Sliding Tile Tabs
 * Uses an inset tactile track with a physical raised white tile that smoothly slides
 * using the spring curve: cubic-bezier(0.34, 1.20, 0.64, 1)
 */
export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = ''
}) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, height: 0, top: 0, opacity: 0 });

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && containerRef.current) {
      setSliderStyle({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        opacity: 1
      });
    }
  }, [activeTab, tabs]);

  // Handle window resize to recompute sliding tile position
  useEffect(() => {
    const handleResize = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl && containerRef.current) {
        setSliderStyle({
          left: activeEl.offsetLeft,
          top: activeEl.offsetTop,
          width: activeEl.offsetWidth,
          height: activeEl.offsetHeight,
          opacity: 1
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className={`tactile-tab-bar relative inline-flex items-center overflow-x-auto no-scrollbar select-none ${className}`}
    >
      {/* Physical Sliding White Tile */}
      <div
        className="absolute bg-white rounded-tile border border-border shadow-tactile-tile pointer-events-none transition-all duration-200"
        style={{
          left: `${sliderStyle.left}px`,
          top: `${sliderStyle.top}px`,
          width: `${sliderStyle.width}px`,
          height: `${sliderStyle.height}px`,
          opacity: sliderStyle.opacity,
          transitionTimingFunction: 'cubic-bezier(0.34, 1.20, 0.64, 1)'
        }}
        aria-hidden="true"
      />

      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current[tab.id] = el;
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-tile whitespace-nowrap transition-colors duration-150 select-none ${
              isActive
                ? 'text-ink font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-academic' : 'text-muted'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isActive ? 'bg-academic-100 text-academic font-semibold' : 'bg-[#E2E4DE] text-muted'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
