import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        muted: "#5c6965",
        line: "#d8e1dc",
        paper: "#fbfaf6",
        mist: "#edf6f2",
        foam: "#ffffff",
        sage: "#4f7d70",
        teal: "#116b6b",
        coral: "#d9664f",
        gold: "#c99239",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 33, 31, 0.14)",
        coral: "0 14px 30px rgba(217, 102, 79, 0.3)",
      },
      borderRadius: {
        card: "8px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "PingFang SC",
          "Microsoft YaHei",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
