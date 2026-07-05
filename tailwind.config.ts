import type { Config } from "tailwindcss";

/**
 * Tema portado 1:1 del objeto `tailwind.config` de includes/header.php
 * del boceto PHP. Se usa Tailwind v3 (no v4) porque el boceto fue escrito
 * contra el Play CDN con semántica v3: cambiar de major alteraría defaults
 * (color de border, ring, sombras) y rompería la fidelidad visual.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      colors: {
        navy: {
          50: "#F1F5FA",
          100: "#E2EAF3",
          200: "#C5D5E7",
          300: "#9DB6D2",
          400: "#6E91B8",
          500: "#47709C",
          600: "#2B5B8C",
          700: "#1E456E",
          800: "#163454",
          900: "#0F2742",
          950: "#0A1A2F",
        },
        gold: {
          400: "#FFC53D",
          500: "#F2A900",
          600: "#D08F00",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,26,47,.06), 0 8px 24px -12px rgba(10,26,47,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
