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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border shadow-tactile-dock px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
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
                  ? 'text-academic font-bold bg-academic-50/90 border border-academic-200/70 shadow-[inset_1px_1px_3px_rgba(23,107,77,0.14),inset_-1px_-1px_2px_rgba(255,255,255,0.9)] translate-y-[0.5px]' 
                  : 'text-muted hover:text-ink active:translate-y-[1px] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)]'}`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-colors duration-140 shrink-0 ${active ? 'text-academic' : 'text-muted'}`} />
              <span className={`text-[10px] tracking-tight transition-colors duration-140 ${active ? 'font-bold text-academic' : 'font-medium text-muted'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
