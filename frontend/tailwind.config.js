/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#1a1a2e',
        panel: '#20243a',
        ink: '#f4f7fb',
      },
    },
  },
  plugins: [],
};
