/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Skala brand agar kelas dari FOS MOBILE (brand-dark, brand-900, dst)
        // tetap resolve. DEFAULT tidak diubah.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          DEFAULT: "#2563eb",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          dark: "#1d4ed8",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.08)",
        soft: "0 4px 16px -2px rgb(16 24 40 / 0.10)",
      },
    },
  },
  plugins: [],
};
