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
        cream: {
          50: "#FFFEFB",
          100: "#FFFDF5",
          200: "#FFF9E6",
          300: "#FFF5D6",
          400: "#FFEFC2",
          500: "#FFE8A8",
          600: "#F5D98A",
          700: "#E8C96E",
          800: "#D4B35C",
          900: "#B8964A",
        },
        sky: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
        },
        sidebar: {
          bg: "#FFFFFF",
          hover: "#F0F9FF",
          active: "#E0F2FE",
          border: "#E2E8F0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "sidebar": "4px 0 24px -2px rgba(14, 165, 233, 0.08)",
        "card": "0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 12px rgba(14, 165, 233, 0.12), 0 2px 4px rgba(0,0,0,0.04)",
        "header": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        "3d": "0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.04)",
        "3d-hover": "0 10px 25px -5px rgba(14, 165, 233, 0.15), 0 4px 6px -2px rgba(0,0,0,0.05)",
      },
      animation: {
        "slide-in": "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out": "slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "submenu-open": "submenuOpen 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "submenu-close": "submenuClose 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "card-enter": "cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(-100%) perspective(800px) rotateY(10deg)", opacity: "0" },
          "100%": { transform: "translateX(0) perspective(800px) rotateY(0deg)", opacity: "1" },
        },
        slideOut: {
          "0%": { transform: "translateX(0) perspective(800px) rotateY(0deg)", opacity: "1" },
          "100%": { transform: "translateX(-100%) perspective(800px) rotateY(10deg)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        submenuOpen: {
          "0%": { opacity: "0", maxHeight: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", maxHeight: "500px", transform: "translateY(0)" },
        },
        submenuClose: {
          "0%": { opacity: "1", maxHeight: "500px", transform: "translateY(0)" },
          "100%": { opacity: "0", maxHeight: "0", transform: "translateY(-8px)" },
        },
        cardEnter: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      perspective: {
        "800": "800px",
        "1000": "1000px",
      },
    },
  },
  plugins: [],
};

export default config;
