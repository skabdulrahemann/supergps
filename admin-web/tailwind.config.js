/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 800: '#1e3a8a', 900: '#172554' },
        dark: { 50: '#f6f8fb', 100: '#e8edf5', 200: '#d7dfeb', 300: '#b8c4d6', 400: '#8796ac', 500: '#5f6f85', 600: '#435064', 700: '#2b3648', 800: '#1b2535', 900: '#101827', 950: '#07111f' },
        fleet: { cyan: '#06b6d4', green: '#10b981', ink: '#0b1220' }
      }
    }
  },
  plugins: []
}
