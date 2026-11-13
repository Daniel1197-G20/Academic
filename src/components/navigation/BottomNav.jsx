import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Compass,
  User,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab, userProfile, unreadMessages = 0 }) {
  const isTutor = userProfile?.role === 'tutor';

  // Floating mobile glass navigation items matching role and verified reference design
  const items = isTutor
    ? [
        {
          id: 'tutor-dashboard',
          label: 'Work',
          icon: Sparkles,
          isActive: (tab) => tab === 'tutor-dashboard' || tab === 'become-tutor'
        },
        {
          id: 'dashboard',
          label: 'Home',
          icon: LayoutDashboard,
          isActive: (tab) => tab === 'dashboard' || tab === 'overview'
        },
        {
          id: 'messages',
          label: 'Chat',
          icon: MessageSquare,
          badge: unreadMessages > 0 ? unreadMessages : null,
          isActive: (tab) => tab === 'messages' || tab === 'community'
        },
        {
          id: 'tutors',
          label: 'Network',
          icon: Compass,
          isActive: (tab) => tab === 'tutors'
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          isActive: (tab) => tab === 'profile' || tab.startsWith('settings') || tab.startsWith('privacy') || tab.startsWith('cookie') || tab.startsWith('terms')
        }
      ]
    : [
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
      className="xl:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-6 z-40 max-w-md mx-auto pointer-events-none"
    >
      <div className="glass-floating-dock rounded-[24px] p-1.5 flex items-center justify-between gap-1 pointer-events-auto">
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 min-h-[48px] min-w-[44px] rounded-[18px] transition-all duration-200 select-none relative whitespace-nowrap
                ${active
                  ? 'text-academic dark:text-[#A7F3D0] font-bold bg-[#176B4D]/12 dark:bg-[#176B4D]/35 border border-[#176B4D]/25 dark:border-[#176B4D]/45 shadow-sm scale-[1.02]'
                  : 'text-[#667085] dark:text-white/60 hover:text-[#111827] dark:hover:text-white active:scale-95'}`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 shrink-0 ${active ? 'scale-110 text-academic dark:text-[#A7F3D0]' : 'text-[#667085] dark:text-white/65'}`} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-[#EF4444] text-white text-[9px] font-bold rounded-full leading-tight">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-150 ${active ? 'font-bold text-academic dark:text-[#A7F3D0]' : 'font-medium text-[#667085] dark:text-white/65'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
