import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B3022",
          soft: "#243D2C",
          deep: "#142419",
        },
        sage: {
          DEFAULT: "#A8C3A0",
          light: "#D4E5CE",
          muted: "#E8F0E4",
          dark: "#6B8F63",
        },
        cream: {
          DEFAULT: "#F7F4EF",
          warm: "#F3EDE4",
          soft: "#FAF8F4",
        },
        peach: {
          DEFAULT: "#F5E6D8",
          soft: "#F8EEE4",
        },
        teal: {
          soft: "#D9E8E4",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(27, 48, 34, 0.06)",
        soft: "0 1px 4px rgba(27, 48, 34, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
