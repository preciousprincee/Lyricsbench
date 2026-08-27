/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F3EC',
        'paper-dim': '#EFE9DC',
        ink: '#1C1A17',
        'ink-soft': '#544E45',
        rust: '#8B3A2B',
        'rust-soft': '#B5614C',
        moss: '#5C6B4F',
        'moss-soft': '#7C8C6C',
        rule: '#C9BFA8',
        teal: '#3D5A6C',
        'teal-soft': '#5E7E91'
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backgroundImage: {
        'rule-lines': 'repeating-linear-gradient(to bottom, transparent, transparent 35px, #C9BFA8 35px, #C9BFA8 36px)'
      },
      boxShadow: {
        notebook: '0 1px 2px rgba(28,26,23,0.06), 0 8px 24px rgba(28,26,23,0.08)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
