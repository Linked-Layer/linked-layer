import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "tailwindcss";

// Resolve content globs relative to THIS file so it works regardless of cwd
// (vite is launched from the monorepo root with root=apps/web).
const here = dirname(fileURLToPath(import.meta.url));

export default {
  content: [join(here, "index.html"), join(here, "src/**/*.{ts,tsx}")],
  theme: {
    extend: {
      colors: {
        bg: "#07070b",
        panel: "#0d0d16",
        "panel-2": "#12121d",
        border: "#1d1d2b",
        muted: "#8b8ba7",
        violet: "#7c5cff",
        cyan: "#22d3ee",
      },
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        serif: ["'Fraunces Variable'", "Fraunces", "Georgia", "serif"],
      },
      backgroundImage: {
        "linked-gradient": "linear-gradient(120deg, #7c5cff 0%, #22d3ee 100%)",
        "radial-fade": "radial-gradient(60% 60% at 50% 0%, rgba(124,92,255,0.18) 0%, rgba(7,7,11,0) 70%)",
      },
      boxShadow: {
        glow: "0 0 80px -20px rgba(124,92,255,0.5)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
