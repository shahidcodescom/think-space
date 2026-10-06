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
        // Token names kept (forest/sage) — values remapped to a red/rose palette.
        forest: {
          DEFAULT: "#7C2430",
          soft: "#933445",
          deep: "#5C1A24",
        },
        sage: {
          DEFAULT: "#D4A0A6",
          light: "#EFD4D8",
          muted: "#F7E9EB",
          dark: "#B06B74",
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
          // Soft mauve companion (was mint) so chips stay distinct in the red theme.
          soft: "#E6DDE8",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(124, 36, 48, 0.07)",
        soft: "0 1px 4px rgba(124, 36, 48, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
