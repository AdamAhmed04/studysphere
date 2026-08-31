/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    /*
     * Tailwind's defaults, listed in full so `xs` sorts ahead of `sm` rather
     * than being appended after it. Only `xs` is new; the rest are the stock
     * values.
     *
     * 360px is where the mobile tab bar stops fitting seven full-word labels.
     * Below it the bar collapses to five tabs plus a "More" menu.
     */
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {},
  },
  plugins: [],
};
