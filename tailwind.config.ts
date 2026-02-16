import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ikkimo: {
          brand: "#7D0705",
          bg: "#FEFEFE",
          text: "#131313",
          border: "rgba(19,19,19,0.12)",
        },
      },
    },
  },
  plugins: [],
};

export default config;