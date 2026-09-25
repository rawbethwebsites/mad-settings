
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
        brand: {
          purple: "#6D28D9", // Strong vibrant purple
          acid: "#BEF264",    // Bright acid green
          cream: "#FDFBF7",  // Off-white cream
          black: "#0A0A0A",  // Rich black
          coral: "#FB7185",   // Orange/Coral accent
          cyan: "#22D3EE",    // Cyan accent
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
    },
  },
  plugins: [],
};
export default config;
