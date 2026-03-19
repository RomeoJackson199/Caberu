import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        accent: "#1A6BFF",
        "heading-text": "#F0EBE0",
        "body-text": "#8A8A8A",
        "border-subtle": "#1E1E1E",
        "surface": "#111111",
        "surface-hover": "#161616",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.2em",
      },
      animation: {
        "grain": "grain 8s steps(10) infinite",
        "float": "float 20s ease-in-out infinite",
      },
      keyframes: {
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-2%, -3%)" },
          "20%": { transform: "translate(-4%, 2%)" },
          "30%": { transform: "translate(2%, -4%)" },
          "40%": { transform: "translate(-2%, 6%)" },
          "50%": { transform: "translate(-3%, 2%)" },
          "60%": { transform: "translate(4%, 0%)" },
          "70%": { transform: "translate(0%, 3%)" },
          "80%": { transform: "translate(-3%, 0%)" },
          "90%": { transform: "translate(2%, 2%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-15px) rotate(1deg)" },
          "66%": { transform: "translateY(8px) rotate(-1deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
