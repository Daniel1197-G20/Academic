/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: '#111827',
        navy: '#172033',
        academic: '#176B4D',
        'academic-light': '#DDEFE5',
        canvas: '#F6F7F3',
        surface: '#FFFFFF',
        muted: '#667085',
        border: '#E5E7EB',
        gold: '#C89B3C',
        danger: '#C24141',
        warning: '#B7791F',
      },
      borderRadius: {
        btn: '10px',
        card: '14px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.02)',
        card: '0 4px 12px 0 rgba(17,24,39,0.07)',
        modal: '0 20px 25px -5px rgba(17,24,39,0.08), 0 8px 10px -6px rgba(17,24,39,0.04)',
      },
    },
  },
  plugins: [],
};
