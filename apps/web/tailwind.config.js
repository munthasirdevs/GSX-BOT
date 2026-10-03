/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: {
          DEFAULT: "#5865F2", // Discord Blurple
          foreground: "#ffffff",
          dark: "#4752C4",
        },
        secondary: {
          DEFAULT: "#2B2D31",
          foreground: "#dbdee1",
        },
        accent: {
          DEFAULT: "#57F287", // Discord Green
          foreground: "#000000",
        },
        danger: {
          DEFAULT: "#ED4245", // Discord Red
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#FEE75C", // Discord Yellow
          foreground: "#000000",
        },
        border: "hsl(var(--border))",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
