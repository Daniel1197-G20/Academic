/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core System Colors
        canvas: '#F6F7F3',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F7F3',
          subtle: '#FAFBF8',
        },
        ink: {
          DEFAULT: '#111827',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0B0F19',
        },
        navy: {
          DEFAULT: '#172033',
          50: '#F4F6F9',
          100: '#E8ECF2',
          200: '#C5D0E0',
          300: '#98ACCA',
          400: '#6482AF',
          500: '#3F6194',
          600: '#2A4673',
          700: '#1F3456',
          800: '#172033',
          900: '#0F1624',
        },
        academic: {
          DEFAULT: '#176B4D',
          50: '#F2F8F5',
          100: '#DDEFE5', // Light Green
          200: '#BCE0CE',
          300: '#8FC9AE',
          400: '#5AAB87',
          500: '#338F6A',
          600: '#176B4D', // Academic Green Primary
          700: '#13583F',
          800: '#104633',
          900: '#0E392B',
          950: '#071F17',
        },
        muted: '#667085',
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#ECEEE9',
          strong: '#D1D5DB',
        },
        gold: {
          DEFAULT: '#C89B3C',
          50: '#FDF9F0',
          100: '#FAF0DB',
          200: '#F4DEB3',
          300: '#EBC785',
          400: '#DFAB56',
          500: '#C89B3C',
          600: '#A97C2B',
          700: '#7E5B21',
          800: '#583F1B',
          900: '#3D2C15',
        },
        danger: {
          DEFAULT: '#C24141',
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#C24141',
          600: '#A63333',
          700: '#8A2727',
        },
        warning: {
          DEFAULT: '#B7791F',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#B7791F',
          600: '#975A16',
        },
      },
      boxShadow: {
        // LEVEL 1 - SURFACE (almost flat, quiet hairlines)
        'tactile-surface': '0 1px 2px 0 rgba(17, 24, 39, 0.03), -1px -1px 2px 0 rgba(255, 255, 255, 0.85)',
        
        // LEVEL 2 - RAISED (cards, hero, dock, modal)
        'tactile-raised': '0 1px 3px 0 rgba(17, 24, 39, 0.04), 0 4px 12px 0 rgba(17, 24, 39, 0.035), -1px -1px 5px 0 rgba(255, 255, 255, 0.85)',
        'tactile-raised-hover': '0 2px 6px 0 rgba(17, 24, 39, 0.05), 0 6px 16px 0 rgba(17, 24, 39, 0.04), -1px -1px 6px 0 rgba(255, 255, 255, 0.95)',
        'tactile-hero': '0 2px 6px 0 rgba(17, 24, 39, 0.045), 0 8px 20px 0 rgba(17, 24, 39, 0.035), -1px -1px 6px 0 rgba(255, 255, 255, 0.95)',
        
        // Tactile Button
        'tactile-btn': '0 1px 3px 0 rgba(17, 24, 39, 0.04), 0 3px 8px 0 rgba(17, 24, 39, 0.03), -1px -1px 3px 0 rgba(255, 255, 255, 0.9)',
        'tactile-btn-hover': '0 2px 5px 0 rgba(17, 24, 39, 0.05), 0 5px 12px 0 rgba(17, 24, 39, 0.04), -1px -1px 4px 0 rgba(255, 255, 255, 0.95)',
        'tactile-btn-press': 'inset 1px 1px 3px 0 rgba(17, 24, 39, 0.06), inset -1px -1px 3px 0 rgba(255, 255, 255, 0.7)',
        
        // LEVEL 3 - PRESSED / INSET (inputs, progress tracks, active controls)
        'tactile-inset': 'inset 2px 2px 5px 0 rgba(17, 24, 39, 0.045), inset -2px -2px 5px 0 rgba(255, 255, 255, 0.8)',
        'tactile-inset-sm': 'inset 1px 1px 3px 0 rgba(17, 24, 39, 0.04), inset -1px -1px 3px 0 rgba(255, 255, 255, 0.75)',
        'tactile-track': 'inset 1px 2px 4px 0 rgba(17, 24, 39, 0.06), inset -1px -1px 3px 0 rgba(255, 255, 255, 0.85)',
        
        // Active tile sliding tab
        'tactile-tile': '0 1px 3px 0 rgba(17, 24, 39, 0.04), 0 3px 6px 0 rgba(17, 24, 39, 0.02), -1px -1px 2px 0 rgba(255, 255, 255, 0.9)',
        
        // Navigation Dock & Modal
        'tactile-dock': '0 -1px 4px 0 rgba(17, 24, 39, 0.03), 0 -4px 12px 0 rgba(17, 24, 39, 0.025), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
        'tactile-modal': '0 8px 24px -4px rgba(17, 24, 39, 0.07), 0 3px 8px -2px rgba(17, 24, 39, 0.03), -1px -1px 5px 0 rgba(255, 255, 255, 0.9)',
      },
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      borderRadius: {
        'card': '16px',     // 14-18px primary cards
        'btn': '11px',      // 10-12px interactive controls
        'hero': '20px',     // 18-22px large hero surfaces
        'tile': '9px',      // tactile sliding tabs
        'track': '6px',     // progress tracks
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.20, 0.64, 1)',
      },
      animation: {
        'streak-breathe': 'streakBreathe 2s ease-in-out infinite',
        'fade-in': 'fadeIn 250ms ease-out forwards',
        'stage-1': 'stagedFade 250ms ease-out 0ms forwards',
        'stage-2': 'stagedFade 250ms ease-out 60ms forwards',
        'stage-3': 'stagedFade 250ms ease-out 120ms forwards',
        'stage-4': 'stagedFade 250ms ease-out 180ms forwards',
        'stage-5': 'stagedFade 250ms ease-out 240ms forwards',
      },
      keyframes: {
        streakBreathe: {
          '0%, 100%': { transform: 'scale(1.00)' },
          '50%': { transform: 'scale(1.03)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        stagedFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
