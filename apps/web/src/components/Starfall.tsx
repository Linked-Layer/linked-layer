import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  vy: number;
  tw: number;
  phase: number;
  color: string;
}
interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  len: number;
}

const COLORS = ["#ffffff", "#b3a6ea", "#7c5cff", "#22d3ee"];

/** Subtle animated starfall for the chat background: drifting twinkling stars + the
 *  occasional shooting star. Canvas-based, pointer-events-none, sized to its parent. */
export function Starfall({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const stars: Star[] = [];
    const meteors: Meteor[] = [];
    let meteorTimer = 120;

    const mkStar = (): Star => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.3,
      vy: Math.random() * 0.22 + 0.04,
      tw: Math.random() * 0.035 + 0.008,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    });

    const spawnMeteor = () => {
      const fromLeft = Math.random() < 0.5;
      const speed = 6 + Math.random() * 4;
      meteors.push({
        x: fromLeft ? Math.random() * w * 0.5 : w * 0.5 + Math.random() * w * 0.5,
        y: -10,
        vx: (fromLeft ? 1 : -1) * speed * 0.55,
        vy: speed,
        life: 0,
        max: 45 + Math.random() * 25,
        len: 9 + Math.random() * 7,
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(260, Math.floor((w * h) / 9000));
      stars.length = 0;
      for (let i = 0; i < target; i++) stars.push(mkStar());
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.y += s.vy;
        s.phase += s.tw;
        if (s.y > h + 2) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        ctx.globalAlpha = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(s.phase))) * 0.7;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      meteorTimer -= 1;
      if (meteorTimer <= 0 && meteors.length < 2) {
        meteorTimer = 200 + Math.random() * 260;
        spawnMeteor();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]!;
        m.x += m.vx;
        m.y += m.vy;
        m.life += 1;
        const tx = m.x - m.vx * m.len;
        const ty = m.y - m.vy * m.len;
        const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, "rgba(179,166,234,0.85)");
        grad.addColorStop(1, "rgba(179,166,234,0)");
        ctx.globalAlpha = Math.max(0, 1 - m.life / m.max);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (m.life >= m.max || m.y > h + 60) meteors.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
