import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A1633",
          900: "#0F1F4B",
          800: "#1A2E6B",
        },
        brand: {
          500: "#2563EB",
          600: "#1D4ED8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
