import { useEffect, useRef } from "react";

/**
 * Warm "fog" that trails the cursor across the background. Two blurred orange blobs
 * ease toward the pointer at different rates — the slower one lags, creating a smoky
 * trail. Pure transform + rAF (no canvas, no React state) so it's cheap. Disabled for
 * touch pointers and prefers-reduced-motion.
 */
export function CursorGlow() {
  const near = useRef<HTMLDivElement>(null);
  const far = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.35;
    const a = { x: tx, y: ty }; // fast layer
    const b = { x: tx, y: ty }; // slow layer (the trailing fog)
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const place = (el: HTMLDivElement | null, p: { x: number; y: number }) => {
      if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`;
    };

    const tick = () => {
      a.x += (tx - a.x) * 0.14;
      a.y += (ty - a.y) * 0.14;
      b.x += (tx - b.x) * 0.06;
      b.y += (ty - b.y) * 0.06;
      place(near.current, a);
      place(far.current, b);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={far}
        className="absolute left-0 top-0 h-[42rem] w-[42rem] rounded-full bg-accent/[0.10] blur-[110px] will-change-transform dark:bg-accent/[0.16]"
      />
      <div
        ref={near}
        className="animate-ember absolute left-0 top-0 h-[24rem] w-[24rem] rounded-full bg-accent/20 blur-[72px] will-change-transform dark:bg-accent/25"
      />
    </div>
  );
}
