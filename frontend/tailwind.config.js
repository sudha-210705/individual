/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05050a',
          card: 'rgba(10, 10, 20, 0.65)',
          border: 'rgba(0, 240, 255, 0.15)',
          cyan: '#00f0ff',
          blue: '#0066ff',
          purple: '#9d4edd',
          pink: '#ff007f',
          green: '#39ff14',
          yellow: '#ffe600',
          text: '#e2e8f0'
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.4), 0 0 30px rgba(0, 240, 255, 0.15)',
        'neon-pink': '0 0 10px rgba(255, 0, 127, 0.4), 0 0 30px rgba(255, 0, 127, 0.15)',
        'neon-purple': '0 0 10px rgba(157, 78, 221, 0.4), 0 0 30px rgba(157, 78, 221, 0.15)',
        'neon-green': '0 0 10px rgba(57, 255, 20, 0.4), 0 0 30px rgba(57, 255, 20, 0.15)'
      },
      backgroundImage: {
        'cyber-grid': 'radial-gradient(circle, rgba(10, 10, 25, 0.8) 0%, rgba(5, 5, 10, 1) 100%)'
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-flow': 'borderFlow 6s linear infinite',
        'float': 'float 4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [],
}
