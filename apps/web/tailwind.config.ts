import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "tailwindcss";

// Resolve content globs relative to THIS file so it works regardless of cwd
// (vite is launched from the monorepo root with root=apps/web).
const here = dirname(fileURLToPath(import.meta.url));

export default {
  content: [join(here, "index.html"), join(here, "src/**/*.{ts,tsx}")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens — values live as RGB channels in index.css (:root + .dark),
        // exposed via rgb(var(--x) / <alpha-value>) so opacity modifiers (accent/15, border/60…)
        // keep working in BOTH themes. Warm-neutral base + orange accent.
        bg: "rgb(var(--bg) / <alpha-value>)", // page background
        panel: "rgb(var(--panel) / <alpha-value>)", // cards / surfaces
        "panel-2": "rgb(var(--panel-2) / <alpha-value>)", // insets, inputs, hover fills
        border: "rgb(var(--border) / <alpha-value>)", // hairline borders
        ink: "rgb(var(--ink) / <alpha-value>)", // primary text
        muted: "rgb(var(--muted) / <alpha-value>)", // secondary text
        accent: "rgb(var(--accent) / <alpha-value>)", // primary brand accent (orange)
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)", // deeper warm partner
        // Back-compat aliases: existing `violet`/`cyan` utility classes resolve to the accent.
        violet: "rgb(var(--accent) / <alpha-value>)",
        cyan: "rgb(var(--accent-2) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
        // Headlines use the same clean grotesk for a serious, software feel.
        serif: ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "linked-gradient": "linear-gradient(120deg, #4f46e5 0%, #818cf8 100%)",
        "radial-fade": "radial-gradient(70% 55% at 50% 0%, rgba(99,102,241,0.08) 0%, rgba(250,250,250,0) 70%)",
      },
      boxShadow: {
        // Soft, neutral elevation — no neon glow on the light theme.
        glow: "0 1px 2px rgba(28,25,23,0.05), 0 16px 40px -20px rgba(28,25,23,0.22)",
        card: "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -16px rgba(28,25,23,0.18)",
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
