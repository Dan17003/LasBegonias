/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        begonias: {
          light: '#e6f7f7',
          DEFAULT: '#11B9BB',
          dark: '#0e9698',
          sidebar: '#11b9bb' 
        }
      }
    },
  },
  plugins: [],
}