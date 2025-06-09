/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B00', // Bright orange
          dark: '#CC5500',    // Darker orange
          light: '#FF8533',   // Lighter orange
        },
        secondary: {
          DEFAULT: '#1A1A1A', // Near black
          dark: '#000000',    // Pure black
          light: '#333333',   // Dark gray
        },
        accent: {
          DEFAULT: '#FFB366', // Light orange
          dark: '#FF9933',    // Medium orange
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
