/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./sections/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts}",
  ],

  theme: {
    extend: {
      colors: {
        luuku: {
          950: "#050507",
          900: "#0A0A0F",
          800: "#13131A",
          100: "#F5F5F7",
        },

        accent: {
          gold: "#D4A017",
          sage: "#7C9A6B",
          clay: "#B85450",
        },
      },

      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "system-ui",
          "sans-serif",
        ],

        mono: [
          "var(--font-geist-mono)",
          "monospace",
        ],
      },

      screens: {
        xs: "390px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },

      container: {
        center: true,
        padding: {
          DEFAULT: "1.5rem",
          lg: "2rem",
          xl: "3rem",
        },
      },

      borderRadius: {
        hero: "32px",
        card: "24px",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(.16,1,.3,1)",
      },
    },
  },

  plugins: [],
};