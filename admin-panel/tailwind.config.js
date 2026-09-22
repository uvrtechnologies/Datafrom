/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff5ff',
          100: '#dce9ff',
          500: '#2f4ed6',
          600: '#2540bf',
          700: '#0f1f4d',
        },
        navy: {
          900: '#0d1b3e',
        },
      },
      fontFamily: {
        serif: ['"Lora"', '"Georgia"', 'serif'],
      },
    },
  },
  plugins: [],
};
