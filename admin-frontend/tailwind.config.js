/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#eefaf8",
          100: "#d7f2ec",
          200: "#ade4d9",
          300: "#7bd1c0",
          400: "#43b4a2",
          500: "#2a9888",
          600: "#1f7a6e",
          700: "#1d625a",
          800: "#1b4f49",
          900: "#1a423e"
        }
      },
      boxShadow: {
        soft: "0 10px 35px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
