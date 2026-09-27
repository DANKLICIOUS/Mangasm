/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#050507',
          900: '#09090D',
          850: '#0E0E14',
          800: '#14141E',
          700: '#1E1E2C',
        },
        chrome: {
          100: '#F5F5F7',
          200: '#E1E1E6',
          300: '#C4C4CC',
          400: '#8D8D99',
          500: '#484852',
        },
        electric: {
          green: '#00FF66',
          glow: 'rgba(0, 255, 102, 0.4)',
        },
        turquoise: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        iridescent: {
          start: '#FF3B81',
          mid: '#7000FF',
          end: '#00F0FF',
        },
        pastel: {
          pink: '#FFB5D5',
          mint: '#A7F3D0',
          lavender: '#E0E7FF',
          amber: '#FDE68A',
        }
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow 4s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 15px rgba(0,255,102,0.3))' },
          '100%': { opacity: '0.8', filter: 'drop-shadow(0 0 35px rgba(0,255,102,0.7))' },
        }
      }
    },
  },
  plugins: [],
}
