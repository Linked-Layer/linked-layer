import { type MotionValue, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Chapter {
  kicker: string;
  word: ReactNode;
  sentence?: string;
  hint?: string;
  cta?: boolean;
  bg: string; // background gradient for this chapter
}

const CHAPTERS: Chapter[] = [
  {
    kicker: "Context, on demand",
    word: (
      <>
        Linked Layer <span className="gradient-text">Layer</span>
      </>
    ),
    hint: "Scroll to start",
    bg: "radial-gradient(80% 70% at 50% 30%, rgba(124,92,255,0.30), rgba(7,7,11,0) 70%)",
  },
  {
    kicker: "For people & agents",
    word: <>Total recall</>,
    sentence: "One call — recall(query, scope) — returns your team's memory, permission-aware.",
    bg: "radial-gradient(80% 70% at 30% 50%, rgba(99,102,241,0.30), rgba(7,7,11,0) 70%)",
  },
  {
    kicker: "Every decision, the why, the status",
    word: <>Ask the company</>,
    sentence: "Chat over everything your team knows — answered with cited sources.",
    bg: "radial-gradient(80% 70% at 70% 50%, rgba(34,211,238,0.22), rgba(7,7,11,0) 70%)",
  },
  {
    kicker: "Slack · GitHub · docs · calls",
    word: (
      <>
        One Layer
        <br />
        <span className="gradient-text">Every Tool</span>
      </>
    ),
    sentence: "Your tools, distilled into a single permission-aware context graph.",
    cta: true,
    bg: "linear-gradient(120deg, rgba(124,92,255,0.22), rgba(34,211,238,0.18))",
  },
];

export function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = CHAPTERS.length;
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(n - 1, Math.round(v * (n - 1)))));
  });

  return (
    <section ref={ref} style={{ height: `${n * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {CHAPTERS.map((c, i) => (
          <BgLayer key={i} progress={scrollYProgress} i={i} n={n} bg={c.bg} />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/30 via-transparent to-bg/70" />

        {CHAPTERS.map((c, i) => (
          <ChapterView key={i} progress={scrollYProgress} i={i} n={n} chapter={c} />
        ))}

        <DiamondRail active={active} total={n} />
      </div>
    </section>
  );
}

function ChapterView({ progress, i, n, chapter }: { progress: MotionValue<number>; i: number; n: number; chapter: Chapter }) {
  const c = (i + 0.5) / n;
  const s = 1 / n;
  const f = s * 0.3;
  const first = i === 0;
  const last = i === n - 1;
  // First chapter is visible at the very top; last stays visible at the end.
  const inp = first
    ? [0, c + s * 0.5 - f, c + s * 0.5]
    : last
      ? [c - s * 0.5, c - s * 0.5 + f, 1]
      : [c - s * 0.5, c - s * 0.5 + f, c + s * 0.5 - f, c + s * 0.5];
  const op = first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0];
  const yo = first ? [0, 0, -80] : last ? [80, 0, 0] : [80, 0, 0, -80];
  const sc = first ? [1, 1, 1.06] : last ? [0.92, 1, 1] : [0.92, 1, 1, 1.06];
  const bl = first ? ["blur(0px)", "blur(0px)", "blur(14px)"] : last ? ["blur(14px)", "blur(0px)", "blur(0px)"] : ["blur(16px)", "blur(0px)", "blur(0px)", "blur(16px)"];
  const rx = first ? [0, 0, -12] : last ? [12, 0, 0] : [12, 0, 0, -12];
  const opacity = useTransform(progress, inp, op);
  const y = useTransform(progress, inp, yo);
  const scale = useTransform(progress, inp, sc);
  const filter = useTransform(progress, inp, bl);
  const rotateX = useTransform(progress, inp, rx);

  return (
    <motion.div
      style={{ opacity, y, scale, filter, rotateX, transformPerspective: 1200 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-5 text-sm font-medium tracking-[0.25em] text-muted">{chapter.kicker.toUpperCase()}</div>
      <h2 className="font-serif text-[15vw] font-light leading-[0.95] text-white md:text-[8.5rem]">{chapter.word}</h2>
      {chapter.sentence && (
        <p className="mt-8 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">{chapter.sentence}</p>
      )}
      {chapter.hint && (
        <motion.p
          className="mt-8 text-sm tracking-[0.2em] text-muted"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          {chapter.hint}
        </motion.p>
      )}
      {chapter.cta && (
        <div className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/demo">
            <Button size="lg">
              Launch demo <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how">
            <Button variant="outline" size="lg">
              How it works
            </Button>
          </a>
        </div>
      )}
    </motion.div>
  );
}

function BgLayer({ progress, i, n, bg }: { progress: MotionValue<number>; i: number; n: number; bg: string }) {
  const c = (i + 0.5) / n;
  const s = 1 / n;
  const opacity = useTransform(progress, [c - s * 0.6, c, c + s * 0.6], [0, 1, 0]);
  return <motion.div style={{ opacity, background: bg }} className="absolute inset-0" />;
}

function DiamondRail({ active, total }: { active: number; total: number }) {
  return (
    <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 flex-col gap-4 md:flex">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rotate-45 border transition-all duration-300 ${
            i === active ? "scale-125 border-violet bg-violet shadow-glow" : "border-muted/50 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
