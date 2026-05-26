import { animate, motion, useInView, useMotionValue, useScroll, useTransform } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Count up to `value` when scrolled into view. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 1.4,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    const unsub = mv.on("change", (v) => setDisplay(format(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, duration, mv, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/** Vertical parallax: shifts children as the section scrolls through the viewport. */
export function Parallax({
  children,
  amount = 60,
  className,
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Infinite marquee row (duplicates children for a seamless loop). */
export function Marquee({
  children,
  speed = 30,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <div className={cn("group relative flex overflow-hidden", className)}>
      <div className="flex shrink-0 animate-marquee items-center gap-4 pr-4 group-hover:[animation-play-state:paused]" style={{ animationDuration: `${speed}s` }}>
        {children}
      </div>
      <div aria-hidden className="flex shrink-0 animate-marquee items-center gap-4 pr-4 group-hover:[animation-play-state:paused]" style={{ animationDuration: `${speed}s` }}>
        {children}
      </div>
    </div>
  );
}
