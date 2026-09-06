/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neuBg: '#0d1310',
        neuCard: '#141b18',
        neuPrimary: '#34d399',
        neuPrimaryDark: '#10b981',
        neuMint: '#6ee7b7',
        neuTextDark: '#f3f5f4',
        neuTextMuted: '#8b968f',
        neuDanger: '#f87171',
        neuBorder: 'rgba(255,255,255,0.08)',
      }
    },
  },
  plugins: [],
}