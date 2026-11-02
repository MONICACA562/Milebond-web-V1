/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './blog/**/*.html',
    './products/**/*.html',
    './services/*.html',
    './solutions/*.html',
    './tools/**/*.html',
    './case-studies/**/*.html',
    './assets/**/*.js',
    './data/**/*.json'
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0a2a2b',
        amber: { DEFAULT: '#a06a30', 500: '#c08648', 600: '#7a5024' },
        whatsapp: '#008138',
        brandgray: {
          50: '#f3f1ea',
          100: '#e6e3d8',
          300: '#cdc8b8',
          500: '#6a7282',
          600: '#5a5950',
          700: '#364153'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 2px 8px rgba(10,42,43,.06)',
        card: '0 4px 20px rgba(10,42,43,.08)',
        lift: '0 8px 30px rgba(10,42,43,.14)'
      }
    }
  },
  plugins: []
};
