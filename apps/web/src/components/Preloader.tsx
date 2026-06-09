import { motion } from "framer-motion";
import { useEffect } from "react";
import { BRAND } from "@/lib/brand";

/** Custom full-screen pre-loader with an animated SVG node graph. */
export function Preloader({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 120 120" className="h-24 w-24">
        <defs>
          <linearGradient id="pl-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        {[
          [60, 24],
          [24, 84],
          [96, 84],
          [60, 64],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="6"
            fill="url(#pl-g)"
            initial={{ scale: 0.4, opacity: 0.3 }}
            animate={{ scale: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
        <motion.path
          d="M60 24 L60 64 L24 84 M60 64 L96 84"
          fill="none"
          stroke="url(#pl-g)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        />
      </svg>
      <p className="mt-6 text-sm tracking-[0.3em] text-muted">{BRAND.name.toUpperCase()}</p>
    </motion.div>
  );
}
