/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152023",
        surface: "#F6F8F8",
        card: "#FFFFFF",
        border: "#E2E8E7",
        teal: {
          50: "#EAF5F4",
          100: "#CFE7E5",
          400: "#2E9E98",
          500: "#0E7C7B",
          600: "#0B5D5C",
          700: "#084645",
        },
        amber: {
          400: "#E8A33D",
          500: "#D68E24",
        },
        danger: {
          400: "#E0645A",
          500: "#C6483E",
        },
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
      },
    },
  },
  plugins: [],
}
