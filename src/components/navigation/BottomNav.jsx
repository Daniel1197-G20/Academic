import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Compass, 
  User 
} from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'cgpa', label: 'CGPA', icon: GraduationCap },
    { id: 'tutors', label: 'Tutors', icon: Compass },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-tactile-dock px-3 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'dashboard' && activeTab === 'overview');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[46px] rounded-btn transition-all duration-150 select-none
                ${isActive 
                  ? 'text-academic font-bold -translate-y-[1px] scale-[1.03] bg-academic-100/40 border border-academic-200/50 shadow-tactile-surface' 
                  : 'text-muted hover:text-ink active:translate-y-[1px]'}`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-colors ${isActive ? 'text-academic' : 'text-muted'}`} />
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold text-academic' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
