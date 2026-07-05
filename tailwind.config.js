/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
          fontFamily: {
            sans: ["Inter", "system-ui", "sans-serif"],
          },
          fontSize: {
            base: ["1.0625rem", { lineHeight: "1.6" }],  // ~17px body, up from Tailwind's default 16px
            lg: ["1.25rem", { lineHeight: "1.6" }],
            xl: ["1.5rem", { lineHeight: "1.4" }],
            "2xl": ["1.875rem", { lineHeight: "1.3" }],
            "3xl": ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
          },
          colors: {
            vistex: {
              bg: "#ffffff",
              bgAlt: "#f5f7fa",
              navy: "#0b1f3d",
            },
          },
        },
      },
  plugins: [],
}
