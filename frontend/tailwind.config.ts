import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#1E1E1E",
        foreground: "#F5F7FA",
        muted: {
          DEFAULT: "#2D2D2D",
          foreground: "#A0AEC0",
        },
        primary: {
          DEFAULT: "#4FD1C5",
          foreground: "#0F172A",
        },
        accent: {
          DEFAULT: "#7C3AED",
          foreground: "#F8FAFC",
        },
        border: "#2D2D2D",
        input: "#2D2D2D",
        ring: "#4FD1C5",
      },
      boxShadow: {
        subtle: "0 8px 24px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-in-out",
        "pulse-dot": "pulse-dot 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

