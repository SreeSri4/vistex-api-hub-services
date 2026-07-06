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
            display: ["\"Space Grotesk\"", "Inter", "system-ui", "sans-serif"],
            mono: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular", "monospace"],
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
              canvas: "#F2F5FA",
              navy: "#0b1f3d",
              navyLight: "#16305c",
            },
            // One accent per catalog category. Used consistently for tab
            // pills, card accents, badges, and icons so the color itself
            // tells you which kind of content you're looking at.
            api: { DEFAULT: "#1D4ED8", soft: "#EEF2FF", text: "#1E40AF" },
            event: { DEFAULT: "#7C3AED", soft: "#F3EEFE", text: "#6D28D9" },
            template: { DEFAULT: "#B45309", soft: "#FEF3E2", text: "#92400E" },
          },
        },
      },
  plugins: [],
}