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
        ink: "#12100f",
        ember: "#ff7a18",
        cream: "#fff4df",
        blush: "#ffebea",
      },
      boxShadow: {
        glow: "0 20px 80px rgba(255, 122, 24, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
