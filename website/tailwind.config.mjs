/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,tsx,ts,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard"', '"Inter"', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        pk: {
          bg: '#0a0a14',
          'bg-alt': '#0e0e1c',
          surface: 'rgba(255,255,255,0.04)',
          'surface-hover': 'rgba(255,255,255,0.07)',
          border: 'rgba(255,255,255,0.08)',
          'border-bright': 'rgba(255,255,255,0.15)',
          accent: '#f0c040',
          'accent-dim': '#c89820',
          'accent-2': '#6366f1',
          text: '#f0f0f8',
          'text-secondary': '#8888a8',
          muted: '#5a5a78',
        },
        type: {
          fire: '#ef5235',
          water: '#4a90d9',
          grass: '#5dba5d',
          electric: '#f0c040',
          earth: '#c49555',
          ice: '#7cc8dd',
          wind: '#8ecbaa',
          poison: '#a855c8',
          metal: '#9a9ab8',
          light: '#f0dd70',
          dark: '#5c4a6a',
          spirit: '#7e6cc8',
          dragon: '#6e52b5',
          fighting: '#d04848',
          rock: '#988855',
          sound: '#d07aa0',
          cosmic: '#3a3a6a',
          normal: '#a8a898',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.25)',
        'glass-lg': '0 8px 40px rgba(0,0,0,0.3)',
        'glass-sm': '0 2px 12px rgba(0,0,0,0.2)',
        glow: '0 0 20px rgba(240,192,64,0.15)',
        'glow-accent': '0 0 30px rgba(240,192,64,0.2)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-up-delay-1': 'fade-up 0.6s ease-out 0.1s both',
        'fade-up-delay-2': 'fade-up 0.6s ease-out 0.2s both',
        'fade-up-delay-3': 'fade-up 0.6s ease-out 0.3s both',
        'fade-up-delay-4': 'fade-up 0.6s ease-out 0.4s both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'slide-right': 'slide-right 0.5s ease-out both',
        'scale-in': 'scale-in 0.3s ease-out both',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
