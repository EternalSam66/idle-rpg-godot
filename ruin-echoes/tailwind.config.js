/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,js}', './index.html'],
  theme: {
    extend: {
      colors: {
        dark: '#0F0F23',
        accent: '#E11D48',
        gold: '#FBBF24',
        neon: '#22D3EE',
        crypt: '#7C3AED',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};
