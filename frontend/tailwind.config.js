/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0A0A0F',
        surface: '#111118',
        border: '#1E1E2E',
        violet: '#6E56CF',
        teal: '#00D4AA',
        text: {
          primary: '#F0F0F5',
          muted: '#6B6B80'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
