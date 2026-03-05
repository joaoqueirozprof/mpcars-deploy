/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066ff',
        'primary-dark': '#0052cc',
        success: '#00c853',
        warning: '#ff9100',
        danger: '#ff1744',
      },
    },
  },
  plugins: [],
}
