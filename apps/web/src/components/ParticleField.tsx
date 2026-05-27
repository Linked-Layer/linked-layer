import { useEffect, useRef } from "react";

/**
 * Interactive "memory field" — a drifting constellation that links to the cursor
 * and pulses/links more densely as you scroll. Rendered once as a fixed global
 * background. Pauses when hidden; respects reduced-motion.
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    type Node = { x: number; y: number; vx: number; vy: number; bx: number; by: number };
    let nodes: Node[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 18000));
      nodes = Array.from({ length: count }, () => {
        const x = Math.random() * w;
        const y = Math.random() * h;
        return { x, y, bx: x, by: y, vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16 };
      });
    };
    resize();
    window.addEventListener("resize", resize);

    // Pointer + scroll energy
    const mouse = { x: -9999, y: -9999, active: false };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => (mouse.active = false);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);

    let pulse = 0; // decays; bumped on scroll
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const dy = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      pulse = Math.min(1, pulse + dy * 0.012);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    let running = true;
    const baseLink = 130;
    const mouseRadius = 220;

    const draw = () => {
      pulse *= 0.94;
      const linkDist = baseLink + pulse * 70;
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        // drift around base, with a gentle pull toward the cursor when near
        n.x += n.vx;
        n.y += n.vy;
        if (Math.abs(n.x - n.bx) > 60) n.vx *= -1;
        if (Math.abs(n.y - n.by) > 60) n.vy *= -1;
        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < mouseRadius && d > 0.1) {
            const pull = (1 - d / mouseRadius) * 0.5;
            n.x += (dx / d) * pull;
            n.y += (dy / d) * pull;
          }
        }
      }

      // node-node links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            const t = 1 - d / linkDist;
            ctx.strokeStyle = `rgba(124,92,255,${t * (0.14 + pulse * 0.22)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // cursor links
      if (mouse.active) {
        for (const n of nodes) {
          const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
          if (d < mouseRadius) {
            const t = 1 - d / mouseRadius;
            ctx.strokeStyle = `rgba(34,211,238,${t * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(34,211,238,0.9)";
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (const n of nodes) {
        ctx.fillStyle = "rgba(160,180,255,0.55)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running && !reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    const onVis = () => {
      running = !document.hidden;
      if (running && !reduce) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
