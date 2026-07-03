import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      minHeight: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
