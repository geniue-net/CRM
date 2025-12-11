export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#BFF747',
          light: '#C8F96A',
          dark: '#A8E03A',
        },
        dark: {
          DEFAULT: '#020203',
          light: '#1A1A1A',
          lighter: '#2A2A2A',
        },
      },
    },
  },
  plugins: [],
}

