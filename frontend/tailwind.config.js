import daisyui from "daisyui"

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
          50: '#fdf8f0',
          100: '#fbeedd',
          200: '#f6d9b5',
          300: '#f0bf82',
          400: '#e89b4c',
          500: '#e27d28',
          600: '#d3651e',
          700: '#af4d1a',
          800: '#8c3e1c',
          900: '#72341a',
        },
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        painperdu: {
          "primary": "#e27d28",
          "secondary": "#af4d1a",
          "accent": "#f0bf82",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
    ],
  },
}