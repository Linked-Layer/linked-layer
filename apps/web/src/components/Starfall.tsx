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

/**
 * Subtle animated starfall for the chat background. Spans the full width; stars live
 * in a band from the top down to `region` of the height (0.5 when the chat is empty,
 * 0.25 once there's a conversation) and fade out toward the band's bottom edge.
 */
export function Starfall({ className, region = 0.5 }: { className?: string; region?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef(region);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);

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

    const bandH = () => Math.max(80, h * regionRef.current);

    const mkStar = (): Star => ({
      x: Math.random() * w,
      y: Math.random() * bandH(),
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
        x: Math.random() * w,
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
      // Density scales with the full width and the band height.
      const target = Math.min(340, Math.floor((w * bandH()) / 5000));
      stars.length = 0;
      for (let i = 0; i < target; i++) stars.push(mkStar());
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);
      const band = bandH();

      for (const s of stars) {
        s.y += s.vy;
        s.phase += s.tw;
        if (s.y > band) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        // Twinkle * fade toward the bottom of the band (smooth blend, no hard edge).
        const fade = Math.max(0, 1 - s.y / band);
        ctx.globalAlpha = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(s.phase))) * 0.7 * fade;
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
        const fade = Math.max(0, 1 - m.y / band);
        ctx.globalAlpha = Math.max(0, 1 - m.life / m.max) * fade;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (m.life >= m.max || m.y > band) meteors.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    // Re-measure once layout settles and on any container size change (fixes a
    // zero/!wrong size at first paint that made stars cluster in one corner).
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
