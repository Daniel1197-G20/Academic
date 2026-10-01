/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
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
        canvas: '#F6F7F3',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F9FAFB',
          subtle: '#F3F4F6',
        },
        // Supporting colors
        muted: '#667085',
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#F0F2F5',
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
        success: {
          DEFAULT: '#176B4D',
          50: '#F2F8F5',
          100: '#DDEFE5',
          600: '#176B4D',
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
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 3px 0 rgba(17, 24, 39, 0.05), 0 1px 2px 0 rgba(17, 24, 39, 0.03)',
        'card-hover': '0 4px 12px 0 rgba(17, 24, 39, 0.07), 0 2px 4px 0 rgba(17, 24, 39, 0.04)',
        'elevated': '0 4px 6px -1px rgba(17, 24, 39, 0.06), 0 2px 4px -2px rgba(17, 24, 39, 0.04)',
        'modal': '0 20px 25px -5px rgba(17, 24, 39, 0.08), 0 8px 10px -6px rgba(17, 24, 39, 0.04)',
        'dropdown': '0 10px 15px -3px rgba(17, 24, 39, 0.07), 0 4px 6px -4px rgba(17, 24, 39, 0.03)',
      },
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      borderRadius: {
        'card': '14px',
        'btn': '10px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
