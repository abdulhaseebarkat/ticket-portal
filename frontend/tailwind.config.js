module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#eef2f7',
          100: '#dbe1ea',
          200: '#b3bed0',
          300: '#8596b0',
          400: '#5b728e',
          500: '#3f5471',
          600: '#33465c',
          700: '#263248',
          800: '#1a2434',
          900: '#0f161f'
        },
        status: {
          critical: '#b91c1c',
          high: '#d97706',
          medium: '#0b7285',
          low: '#164e63',
          open: '#f97316',
          progress: '#0ea5e9',
          resolved: '#16a34a'
        }
      },
      boxShadow: {
        card: '0 18px 40px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [],
};
