/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#0a1628',
        'primary-blue': '#1e3a5f',
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-orange': '#f59e0b',
        'accent-red': '#ef4444',
        'bg-light': '#f8fafc',
        'card-white': '#ffffff',
        'text-primary': '#1e293b',
        'text-secondary': '#64748b',
      },
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
