/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,tsx,ts,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"DungGeunMo"', '"Press Start 2P"', 'monospace'],
      },
      colors: {
        pk: {
          bg: '#0f0f1a',
          'bg-alt': '#141425',
          surface: '#1a1a30',
          'surface-hover': '#222244',
          border: '#3a3a5c',
          'border-bright': '#5a5a8c',
          accent: '#FFCC00',
          'accent-dim': '#CC9900',
          text: '#e8e8f0',
          'text-secondary': '#9999bb',
          muted: '#666688',
        },
        type: {
          fire: '#FF4422',
          water: '#3399FF',
          grass: '#44BB44',
          electric: '#FFCC00',
          earth: '#BB8844',
          ice: '#66CCEE',
          wind: '#99DDBB',
          poison: '#AA44CC',
          metal: '#AAAACC',
          light: '#FFEE88',
          dark: '#554466',
          spirit: '#7766CC',
          dragon: '#6644BB',
          fighting: '#CC4444',
          rock: '#887744',
          sound: '#DD77AA',
          cosmic: '#222255',
          normal: '#BBBBAA',
        },
      },
      boxShadow: {
        pixel: '4px 4px 0px 0px rgba(0,0,0,0.9)',
        'pixel-sm': '2px 2px 0px 0px rgba(0,0,0,0.9)',
        'pixel-lg': '6px 6px 0px 0px rgba(0,0,0,0.9)',
        glow: '0 0 12px rgba(255,204,0,0.3)',
        'glow-blue': '0 0 12px rgba(51,153,255,0.3)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 8px currentColor, 0 0 16px currentColor' },
          '50%': { textShadow: '0 0 16px currentColor, 0 0 32px currentColor' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pixel-blink': {
          '0%, 90%, 100%': { opacity: '1' },
          '95%': { opacity: '0' },
        },
        'scanline-move': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'counter': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.8)' },
          '60%': { transform: 'translateY(-2px) scale(1.05)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-up-delay-1': 'fade-up 0.5s ease-out 0.1s both',
        'fade-up-delay-2': 'fade-up 0.5s ease-out 0.2s both',
        'fade-up-delay-3': 'fade-up 0.5s ease-out 0.3s both',
        'fade-up-delay-4': 'fade-up 0.5s ease-out 0.4s both',
        'fade-up-delay-5': 'fade-up 0.5s ease-out 0.5s both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-right': 'slide-right 0.4s ease-out both',
        'scale-in': 'scale-in 0.3s ease-out both',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pixel-blink': 'pixel-blink 4s steps(1) infinite',
        'counter': 'counter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
