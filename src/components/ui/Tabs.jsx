import React from 'react';

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = ''
}) {
  return (
    <div className={`flex items-center p-1 bg-[#08090B] border border-white/[0.04] rounded-xl neu-inset overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 select-none
              ${isActive 
                ? 'bg-[#14191E] text-ghost-200 border border-ghost-200/20 shadow-neu-raised-sm' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-ghost-200/20 text-ghost-200' : 'bg-zinc-800 text-zinc-400'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
