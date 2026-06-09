import { motion } from "framer-motion";
import { type RefObject, useLayoutEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

/**
 * Interactive snapshot of the team's context graph. The text cards sit in a row across
 * the TOP; the hub "M" sits lower-center. The projector beam itself lives at the chat
 * `<main>` level (see ProjectorBeam) so it can start from the real screen corner.
 */
interface GraphNode {
  x: number; // % of container
  y: number;
  kind: string;
  label: string;
  prompt: string;
}

// Hub position (lower-center of the graph box). Pulled up so the rays to the
// top cards stay short on wide screens.
const HUB = { x: 50, y: 56 };

// Cards laid out left → right across the top. Dropped a little lower (and the hub
// raised) to shorten the rays between them and the hub.
const NODES: GraphNode[] = [
  { x: 9, y: 22, kind: "Decision", label: "Solana for x402", prompt: "Why did the team pick Solana?" },
  { x: 25, y: 22, kind: "Thread", label: "Agent pricing", prompt: "How is agent pricing set?" },
  { x: 41, y: 22, kind: "Doc", label: "Architecture", prompt: "What is the architecture?" },
  { x: 58, y: 22, kind: "Action", label: "MCP server", prompt: "What's the status of the MCP server?" },
  { x: 74, y: 22, kind: "Doc", label: "$LINKED token", prompt: "How does the $LINKED token work?" },
  { x: 91, y: 22, kind: "Doc", label: "Getting access", prompt: "How do I get access?" },
];

const ease = [0.22, 1, 0.36, 1] as const;
// How far the rays reach from the hub toward each card (slightly short → stubby rays).
const RAY = 0.82;

// The graph box is locked to 16:10, so a viewBox-x unit is 1.6x a viewBox-y unit on screen.
// The ring around M is a fixed 80px circle (radius 40px); in this stretched viewBox that
// reads as an ellipse - radius ~5.2 units across, ~8.3 down (measured at the ~768px desktop
// width). We start each ray on that ellipse so the lines leave the ring's outline, not the M.
const SX = 1;
const SY = 0.625; // height / width of the 16:10 box
const RING_RX = 5.2;
const RING_RY = 8.3;

/** Point on the ring's outline in the direction of a node, in viewBox (0-100) units. */
function ringStart(n: GraphNode) {
  const dx = n.x - HUB.x;
  const dy = n.y - HUB.y;
  const len = Math.hypot(dx * SX, dy * SY) || 1;
  return {
    x: HUB.x + RING_RX * ((dx * SX) / len),
    y: HUB.y + RING_RY * ((dy * SY) / len),
  };
}

export function MemoryGraph({
  onPick,
  hubRef,
  active = false,
}: {
  onPick: (prompt: string) => void;
  hubRef?: RefObject<HTMLDivElement>;
  active?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl">
      {/* edges — short rays from the hub toward each top card */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {NODES.map((n, i) => {
          const s = ringStart(n);
          return (
          <line
            key={i}
            className="stroke-accent"
            x1={s.x}
            y1={s.y}
            x2={HUB.x + (n.x - HUB.x) * RAY}
            y2={HUB.y + (n.y - HUB.y) * RAY}
            strokeOpacity="0.7"
            strokeWidth="1.1"
            strokeDasharray="1.6 2.2"
            vectorEffect="non-scaling-stroke"
          >
            <animate attributeName="stroke-dashoffset" from="7.6" to="0" dur="2.4s" repeatCount="indefinite" />
          </line>
          );
        })}
      </svg>

      {/* hub — just the mark; it's illuminated by the beam, it doesn't emit light */}
      <div
        ref={hubRef}
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
      >
        {/* ring the beam "draws" around the M once the light lands on it */}
        <motion.span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-20 w-20 rounded-full border-2 border-accent/70 shadow-[0_0_22px_rgba(99,102,241,0.4)]"
          style={{ x: "-50%", y: "-50%" }}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={active ? { opacity: [1, 0.55, 1], scale: 1 } : { opacity: 1, scale: 1 }}
          transition={
            active ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6, delay: 2, ease }
          }
        />
        <LogoMark className="relative h-11 w-auto" />
      </div>

      {/* cards (top row) */}
      {NODES.map((n, i) => (
        <button
          key={i}
          onClick={() => onPick(n.prompt)}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          className="group absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-panel px-2 py-1 text-left shadow-sm transition-colors hover:border-accent/60 hover:bg-panel-2"
        >
          <div className="font-mono text-[8px] uppercase tracking-wider text-accent">{n.kind}</div>
          <div className="text-[11px] text-muted group-hover:text-ink">{n.label}</div>
        </button>
      ))}
    </div>
  );
}

/**
 * Orange "projector" beam, rendered at the chat `<main>` level (its offset parent), so its
 * narrow apex sits at the real bottom-right screen corner and it widens onto the hub "M".
 * Measures the hub's live position; grows in from the corner on load; blinks while `active`
 * (composer in use). Unmounts with the empty state once a message is sent → light disappears.
 */
export function ProjectorBeam({ hubRef, active = false }: { hubRef: RefObject<HTMLDivElement>; active?: boolean }) {
  const [geo, setGeo] = useState<{ mx: number; my: number; w: number; h: number } | null>(null);
  // Hold the beam back until the empty-state entrance has settled, so it's measured against the
  // FINAL hub position and plays one clean grow-in (no measure-then-snap "miss").
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const hub = hubRef.current;
      const overlay = document.getElementById("mg-beam-host");
      if (!hub || !overlay) return;
      // Position relative to the beam host, which fills <main> (its corner is the screen corner).
      const pr = overlay.getBoundingClientRect();
      const hr = hub.getBoundingClientRect();
      setGeo({ mx: hr.left + hr.width / 2 - pr.left, my: hr.top + hr.height / 2 - pr.top, w: pr.width, h: pr.height });
    };
    measure();
    // Reveal once the entrance (stagger + rise) has finished, measuring at the final position.
    const reveal = setTimeout(() => {
      measure();
      setShown(true);
    }, 750);
    window.addEventListener("resize", measure);
    // Re-measure when <main> resizes (e.g. the sidebar collapses) so the beam tracks the hub.
    const overlay = document.getElementById("mg-beam-host");
    const ro = overlay && "ResizeObserver" in window ? new ResizeObserver(() => measure()) : null;
    if (overlay && ro) ro.observe(overlay);
    return () => {
      clearTimeout(reveal);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [hubRef]);

  // Keep the host mounted (so it can be measured) but don't paint the beam until settled.
  if (!geo || !shown) return <div id="mg-beam-host" aria-hidden className="pointer-events-none absolute inset-0 z-0" />;

  const { mx, my, w, h } = geo;
  const dx = mx - w;
  const dy = my - h;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const half = 26; // half-width of the lit base at the hub (px) — a slim shaft landing inside the ring
  const b1 = `${mx + px * half},${my + py * half}`;
  const b2 = `${mx - px * half},${my - py * half}`;

  return (
    <div id="mg-beam-host" aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <motion.svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-full w-full blur-[10px]"
        style={{ transformOrigin: "100% 100%" }}
        initial={{ scale: 0.28, opacity: 0 }}
        animate={active ? { scale: 1, opacity: [1, 0.55, 1] } : { scale: 1, opacity: 1 }}
        transition={
          active ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 1.3, ease }
        }
      >
        <defs>
          <linearGradient id="mg-beam-grad" gradientUnits="userSpaceOnUse" x1={mx} y1={my} x2={w} y2={h}>
            <stop offset="0" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="0.55" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <polygon points={`${w},${h} ${b1} ${b2}`} fill="url(#mg-beam-grad)" />
      </motion.svg>
    </div>
  );
}
