import type { MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

type Pt = { x: number; y: number };

const COUNT = 320;

/** Sample `count` normalized points (0..1) from a drawn silhouette. */
function sampleDrawing(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, count: number): Pt[] {
  const w = 360;
  const h = 360;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) return [];
  draw(ctx, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const filled: Pt[] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3]! > 130) filled.push({ x: x / w, y: y / h });
    }
  }
  if (filled.length === 0) return Array.from({ length: count }, () => ({ x: 0.5, y: 0.5 }));
  // Resample to exactly `count` points.
  const out: Pt[] = [];
  for (let i = 0; i < count; i++) out.push(filled[Math.floor((i / count) * filled.length)]!);
  return out;
}

/** Themed shapes (point clouds) for the journey chapters. */
function buildShapes(): Pt[][] {
  // 0 — "M" letterform (Linked Layer)
  const letter = sampleDrawing((ctx, w, h) => {
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${h * 0.78}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("M", w / 2, h * 0.54);
  }, COUNT);

  // 1 — context graph: hub + ring of nodes + connecting spokes
  const graph: Pt[] = [];
  const cx = 0.5;
  const cy = 0.5;
  const R = 0.34;
  const ring = 7;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    const nx = cx + Math.cos(a) * R;
    const ny = cy + Math.sin(a) * R;
    // node cluster
    for (let k = 0; k < 6; k++) graph.push({ x: nx + (Math.random() - 0.5) * 0.03, y: ny + (Math.random() - 0.5) * 0.03 });
    // spoke to center
    const seg = 20;
    for (let s = 0; s < seg; s++) graph.push({ x: cx + (nx - cx) * (s / seg), y: cy + (ny - cy) * (s / seg) });
  }
  for (let k = 0; k < 10; k++) graph.push({ x: cx + (Math.random() - 0.5) * 0.04, y: cy + (Math.random() - 0.5) * 0.04 });
  const graphPts = resample(graph, COUNT);

  // 2 — chat bubble (ask the company)
  const bubble = sampleDrawing((ctx, w, h) => {
    ctx.fillStyle = "#fff";
    const x = w * 0.16;
    const y = h * 0.2;
    const bw = w * 0.68;
    const bh = h * 0.42;
    const r = 40;
    roundRect(ctx, x, y, bw, bh, r);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.38, y + bh - 2);
    ctx.lineTo(w * 0.34, h * 0.78);
    ctx.lineTo(w * 0.52, y + bh - 2);
    ctx.closePath();
    ctx.fill();
    // punch out three dots so it reads as a chat bubble
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.36 + i * w * 0.14, y + bh / 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }, COUNT);

  // 3 — stacked layers (one layer, every tool)
  const layers = sampleDrawing((ctx, w, h) => {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) roundRect(ctx, w * 0.22, h * (0.28 + i * 0.18), w * 0.56, h * 0.1, 16), ctx.fill();
  }, COUNT);

  return [letter, graphPts, bubble, layers];
}

function resample(pts: Pt[], count: number): Pt[] {
  if (pts.length === 0) return Array.from({ length: count }, () => ({ x: 0.5, y: 0.5 }));
  const out: Pt[] = [];
  for (let i = 0; i < count; i++) out.push(pts[Math.floor((i / count) * pts.length)]!);
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Particles that disperse as free-floating stars between chapters and smoothly
 * assemble into themed point-cloud shapes at each chapter center, driven by the
 * journey scroll `progress`. Cursor-reactive.
 */
export function MorphField({ progress, chapters, className }: { progress: MotionValue<number>; chapters: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shapes = buildShapes();
    let w = 0;
    let h = 0;
    let dpr = 1;

    type P = { x: number; y: number; fx: number; fy: number; vx: number; vy: number };
    let ps: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ps.length === 0) {
        ps = Array.from({ length: COUNT }, () => {
          const x = Math.random() * w;
          const y = Math.random() * h;
          return { x, y, fx: x, fy: y, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 };
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: -9999, y: -9999, active: false };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    let running = true;

    const draw = () => {
      const p = progress.get();
      const seg = p * chapters;
      const idx = Math.max(0, Math.min(chapters - 1, Math.floor(seg)));
      const within = seg - idx;
      // assembled in the middle of each chapter, dispersed near the edges
      const edge = 0.26;
      let a = 1;
      if (within < edge) a = within / edge;
      else if (within > 1 - edge) a = (1 - within) / edge;
      const assembly = smoothstep(a);

      // Assemble the shape LARGE and CENTERED, as a backdrop behind the text
      // (a glass panel sits over the middle, blurring the shape for legibility).
      const narrow = w < 768;
      const size = Math.min(w, h) * (narrow ? 0.86 : 0.7);
      const cxr = w * 0.5;
      const cyr = h * 0.5;
      const ox = cxr - size / 2;
      const oy = cyr - size / 2;
      const shape = shapes[idx]!;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < ps.length; i++) {
        const pt = ps[i]!;
        // free float base drift
        pt.fx += pt.vx;
        pt.fy += pt.vy;
        if (pt.fx < 0 || pt.fx > w) pt.vx *= -1;
        if (pt.fy < 0 || pt.fy > h) pt.vy *= -1;

        const sp = shape[i % shape.length]!;
        const tx = pt.fx * (1 - assembly) + (ox + sp.x * size) * assembly;
        const ty = pt.fy * (1 - assembly) + (oy + sp.y * size) * assembly;
        pt.x += (tx - pt.x) * 0.1;
        pt.y += (ty - pt.y) * 0.1;

        if (mouse.active) {
          const dx = pt.x - mouse.x;
          const dy = pt.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.1) {
            const push = (1 - d / 120) * 6;
            pt.x += (dx / d) * push;
            pt.y += (dy / d) * push;
          }
        }
      }

      // links — denser when assembled (so the picture reads)
      const linkDist = 30 + assembly * 38;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a1 = ps[i]!;
          const b1 = ps[j]!;
          const d = Math.hypot(a1.x - b1.x, a1.y - b1.y);
          if (d < linkDist) {
            const t = 1 - d / linkDist;
            ctx.strokeStyle = `rgba(124,92,255,${t * (0.12 + assembly * 0.3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.stroke();
          }
        }
      }
      for (const pt of ps) {
        ctx.fillStyle = `rgba(${assembly > 0.5 ? "180,210,255" : "150,170,255"},0.8)`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running && !reduce && !(window as unknown as { __freezeCanvas?: boolean }).__freezeCanvas)
        raf = requestAnimationFrame(draw);
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
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [progress, chapters]);

  return <canvas ref={ref} className={className} />;
}
