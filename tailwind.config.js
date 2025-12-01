// taken from https://coolors.co/palettes/trending
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        evergreen: { DEFAULT: '#132a13', 100: '#040804', 200: '#081108', 300: '#0b190b', 400: '#0f220f', 500: '#132a13', 600: '#2f682f', 700: '#4ba64b', 800: '#83c783', 900: '#c1e3c1' },
        hunter_green: { DEFAULT: '#31572c', 100: '#0a1209', 200: '#142312', 300: '#1e351b', 400: '#284724', 500: '#31572c', 600: '#4e8a46', 700: '#71b368', 800: '#a0cc9b', 900: '#d0e6cd' },
        fern: { DEFAULT: '#4f772d', 100: '#101809', 200: '#202f12', 300: '#2f471b', 400: '#3f5f24', 500: '#4f772d', 600: '#71a940', 700: '#94c668', 800: '#b8d99a', 900: '#dbeccd' },
        palm_leaf: { DEFAULT: '#90a955', 100: '#1d2211', 200: '#3a4422', 300: '#576633', 400: '#738844', 500: '#90a955', 600: '#a6bb77', 700: '#bdcc99', 800: '#d3ddbb', 900: '#e9eedd' },
        lime_cream: { DEFAULT: '#ecf39e', 100: '#424809', 200: '#858f12', 300: '#c7d71b', 400: '#deea58', 500: '#ecf39e', 600: '#f0f6b3', 700: '#f4f8c6', 800: '#f8fad9', 900: '#fbfdec' }
      },
    },
  },
  plugins: [],
};