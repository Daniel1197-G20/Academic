/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zero: '#050505',
        surface: {
          50: '#090A0B',
          100: '#0E1012',
          200: '#13161A',
          300: '#1A1E24',
          400: '#232932',
          500: '#2E3642',
        },
        ghost: {
          50: '#F4FFF7',
          100: '#E4FFE9',
          200: '#D7FFE0', // Ghost Green Primary
          300: '#B0F7C2',
          400: '#7FEAA0',
          500: '#46D475',
          600: '#23B053',
          700: '#1A8741',
          800: '#166935',
          900: '#12542C',
          glow: 'rgba(215, 255, 224, 0.25)'
        }
      },
      boxShadow: {
        'neu-raised': '-4px -4px 12px rgba(255, 255, 255, 0.025), 5px 6px 16px rgba(0, 0, 0, 0.85)',
        'neu-raised-sm': '-2px -2px 6px rgba(255, 255, 255, 0.02), 3px 3px 10px rgba(0, 0, 0, 0.75)',
        'neu-inset': 'inset 3px 3px 6px rgba(0, 0, 0, 0.9), inset -2px -2px 5px rgba(255, 255, 255, 0.03)',
        'neu-pressed': 'inset 2px 2px 4px rgba(0, 0, 0, 0.95), inset -1px -1px 3px rgba(255, 255, 255, 0.02)',
        'glass-rim': '0 0 0 1px rgba(215, 255, 224, 0.08), 0 8px 32px rgba(0, 0, 0, 0.6)',
        'glass-glow': '0 0 25px rgba(215, 255, 224, 0.15), 0 0 0 1px rgba(215, 255, 224, 0.2)',
        'ghost-glow': '0 0 16px rgba(215, 255, 224, 0.35)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(0.995)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
