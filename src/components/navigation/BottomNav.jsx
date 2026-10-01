import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Users, 
  User 
} from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'cgpa', label: 'CGPA', icon: GraduationCap },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'community', label: 'Groups', icon: Users },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07090C]/90 backdrop-blur-xl border-t border-white/[0.08] px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-all duration-150 select-none relative
                ${isActive 
                  ? 'text-ghost-200' 
                  : 'text-zinc-500 hover:text-zinc-300 active:scale-95'}`}
            >
              {isActive && (
                <div className="absolute top-1 w-8 h-1 bg-ghost-200 rounded-full shadow-ghost-glow" />
              )}
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-ghost-200' : 'text-zinc-400'}`} />
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold text-ghost-200' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
