import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CheckSquare, 
  Compass, 
  User
} from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab }) {
  const items = [
    { 
      id: 'dashboard', 
      label: 'Home', 
      icon: LayoutDashboard,
      isActive: (tab) => tab === 'dashboard' || tab === 'overview'
    },
    { 
      id: 'study', 
      label: 'Study', 
      icon: BookOpen,
      isActive: (tab) => tab === 'study'
    },
    { 
      id: 'test-prep', 
      label: 'Test', 
      icon: CheckSquare,
      isActive: (tab) => tab === 'test-prep' || tab === 'prep'
    },
    { 
      id: 'tutors', 
      label: 'Tutors', 
      icon: Compass,
      isActive: (tab) => tab === 'tutors' || tab === 'messages' || tab === 'community'
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: User,
      isActive: (tab) => tab === 'profile' || tab.startsWith('settings') || tab.startsWith('privacy') || tab.startsWith('cookie') || tab.startsWith('terms')
    }
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1913]/95 backdrop-blur-md border-t border-border dark:border-white/10 shadow-tactile-dock px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(activeTab);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 min-h-[48px] min-w-[48px] rounded-xl transition-all duration-140 select-none
                ${active 
                  ? 'text-academic dark:text-[#A7F3D0] font-bold bg-academic-50/90 dark:bg-[#176B4D]/30 border border-academic-200/70 dark:border-[#176B4D]/40 shadow-sm translate-y-[0.5px]' 
                  : 'text-muted dark:text-white/60 hover:text-ink dark:hover:text-white active:translate-y-[1px]'}`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-colors duration-140 shrink-0 ${active ? 'text-academic dark:text-[#A7F3D0]' : 'text-muted dark:text-white/60'}`} />
              <span className={`text-[10px] tracking-tight transition-colors duration-140 ${active ? 'font-bold text-academic dark:text-[#A7F3D0]' : 'font-medium text-muted dark:text-white/60'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
