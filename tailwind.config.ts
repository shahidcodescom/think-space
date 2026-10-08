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
        // Token names kept (forest/sage) — values remapped to a navy/soft-blue palette.
        forest: {
          DEFAULT: "#1E3A5F",
          soft: "#2A4A73",
          deep: "#152A45",
        },
        sage: {
          DEFAULT: "#A3B8D4",
          light: "#D0DCEC",
          muted: "#E8EEF5",
          dark: "#6B8AAD",
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
          // Soft cool companion so chips stay distinct from sage-muted.
          soft: "#D5E4E8",
        },
      },
      fontFamily: {
        // font-serif is the heading/display token — Poppins since it's geometric sans.
        serif: ["var(--font-poppins)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(30, 58, 95, 0.07)",
        soft: "0 1px 4px rgba(30, 58, 95, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
