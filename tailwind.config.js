/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Category colors with dark mode variants
        'cat-brown': { light: '#8B4513', DEFAULT: '#8B4513', dark: '#A0522D' },
        'cat-purple': { light: '#800080', DEFAULT: '#800080', dark: '#9932CC' },
        'cat-blue': { light: '#0066CC', DEFAULT: '#0066CC', dark: '#4D94FF' },
        'cat-gold': { light: '#FFB800', DEFAULT: '#FFB800', dark: '#FFCC00' },
        'cat-green': { light: '#00AA00', DEFAULT: '#00AA00', dark: '#00CC00' },
        'cat-yellow': { light: '#FFD700', DEFAULT: '#FFD700', dark: '#FFED4E' },
        'cat-lavender': { light: '#9966CC', DEFAULT: '#9966CC', dark: '#B19CD9' },
        'cat-pink': { light: '#FF69B4', DEFAULT: '#FF69B4', dark: '#FF85C1' },
        'cat-orange': { light: '#FF8800', DEFAULT: '#FF8800', dark: '#FFA500' },
        'cat-grey': { light: '#808080', DEFAULT: '#808080', dark: '#A0A0A0' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
