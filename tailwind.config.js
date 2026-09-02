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
    /*
     * The Sandglass tokens, mirrored as utilities so components can say
     * `text-sand` rather than an arbitrary hex. The source of truth is
     * src/styles/tokens.css; these must stay in step with it.
     */
    extend: {
      colors: {
        void: '#0C0A14',
        plum: '#2E2154',
        teal: '#10394B',
        ember: '#3E2440',
        sand: { DEFAULT: '#D8A05F', lo: '#B8814A' },
        ink: '#F2EFF8',
        muted: '#A9A2C0',
        pearl: '#EAE6F4',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        ui: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '22px',
      },
    },
  },
  plugins: [],
};
