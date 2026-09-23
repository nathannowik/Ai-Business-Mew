import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#4338ca", soft: "#eef2ff", ink: "#312e81" },
      },
    },
  },
  plugins: [],
} satisfies Config;
