/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Rajdhani"', 'sans-serif'],
      },
      colors: {
        'rq-base': '#000000',
        'rq-panel': '#050505',
        'rq-blue': 'var(--rq-blue)',
        'rq-blue-dim': 'var(--rq-blue-dim)',
        'rq-green': 'var(--rq-green)',
        'rq-green-dim': 'var(--rq-green-dim)',
        'rq-red': '#d53e3eff',
        'rq-red-dim': 'rgba(239, 68, 68, 0.1)',
        'rq-amber': 'var(--rq-amber)',
        'rq-amber-dim': 'var(--rq-amber-dim)',
        'rq-border': '#1e293b',
        'sci-cyan': '#07a0baff',
        'sci-cyan-dim': 'rgba(6, 182, 212, 0.1)'
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 6s linear infinite',
        'spin-reverse': 'spin-reverse 8s linear infinite',
        'marquee': 'marquee 25s linear infinite',
        'scan': 'scan 4s linear infinite',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        glitch: {
          '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
          '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
          '62%': { transform: 'translate(0,0) skew(5deg)' },
        }
      }
    },
  },
  plugins: [],
}
