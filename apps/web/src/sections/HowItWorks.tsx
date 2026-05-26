import { Boxes, GitBranch, Plug, Sparkles } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { type ReactNode, useRef, useState } from "react";
import { Section } from "@/components/Section";
import { cn } from "@/lib/utils";

const STEPS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <Plug className="h-5 w-5" />,
    title: "Connect sources",
    desc: "Slack, GitHub, Drive/Notion, Linear/Jira, calls and CRM ingest into one place — permissions mirrored from the source.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Build the graph",
    desc: "A permission-aware context graph of projects, people, decisions, threads and their links, kept current.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Distill",
    desc: "An LLM continuously extracts decisions, the “why”, action items and statuses — deduped and fresh.",
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "Recall",
    desc: "People ask the company; agents pull context via MCP / Context API in a single recall(query, scope) call.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(STEPS.length - 1, Math.floor(v * STEPS.length))));
  });

  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="From scattered tools to one recall()"
      subtitle="A continuous pipeline turns your team's activity into durable, permission-aware memory."
    >
      <div ref={ref} className="grid gap-10 md:grid-cols-2">
        {/* Sticky visual (desktop) */}
        <div className="hidden md:block">
          <div className="sticky top-28 flex h-[420px] items-center justify-center">
            <StepVisual index={active} />
          </div>
        </div>

        {/* Steps */}
        <div className="md:py-[20vh]">
          {STEPS.map((s, i) => (
            <div key={s.title} className="md:flex md:min-h-[60vh] md:items-center">
              <motion.div
                className={cn(
                  "panel mb-5 w-full p-6 transition-all duration-500 md:mb-0",
                  i === active ? "border-violet/60 opacity-100 shadow-glow" : "md:opacity-40",
                )}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet/15 text-violet">
                  {s.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  <span className="gradient-text">{String(i + 1).padStart(2, "0")}</span> · {s.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted">{s.desc}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** The pinned graphic that morphs between pipeline stages. */
function StepVisual({ index }: { index: number }) {
  const nodes = [
    [60, 40],
    [60, 110],
    [60, 180],
    [60, 250],
  ];
  return (
    <div className="panel relative flex h-full w-full items-center justify-center overflow-hidden p-8">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet/15 blur-3xl" />
      <svg viewBox="0 0 320 300" className="h-full w-full max-w-sm">
        <defs>
          <linearGradient id="hiw-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {/* left rail: sources funnel into the graph */}
        {nodes.map(([_, y], i) => (
          <motion.g key={i} animate={{ opacity: index >= 0 ? 1 : 0.3 }}>
            <motion.circle cx={40} cy={y} r={index === 0 ? 9 : 6} fill="url(#hiw-g)" />
            <motion.line
              x1={49}
              y1={y}
              x2={150}
              y2={150}
              stroke="url(#hiw-g)"
              strokeWidth="1.5"
              animate={{ opacity: index >= 1 ? 0.7 : 0.15 }}
            />
          </motion.g>
        ))}
        {/* center: the graph node */}
        <motion.circle cx={150} cy={150} r={index >= 1 ? 22 : 14} fill="url(#hiw-g)" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        {/* distill ring */}
        <motion.circle
          cx={150}
          cy={150}
          r={40}
          fill="none"
          stroke="url(#hiw-g)"
          strokeWidth="2"
          strokeDasharray="6 8"
          animate={{ rotate: 360, opacity: index >= 2 ? 0.9 : 0.2 }}
          transition={{ rotate: { duration: 12, repeat: Infinity, ease: "linear" } }}
          style={{ transformOrigin: "150px 150px" }}
        />
        {/* right: recall output */}
        <motion.line x1={172} y1={150} x2={280} y2={150} stroke="url(#hiw-g)" strokeWidth="2" animate={{ opacity: index >= 3 ? 1 : 0.15 }} />
        <motion.circle cx={288} cy={150} r={index === 3 ? 11 : 7} fill="url(#hiw-g)" animate={{ opacity: index >= 3 ? 1 : 0.3 }} />
      </svg>
      <div className="absolute bottom-5 left-0 right-0 text-center text-xs uppercase tracking-[0.25em] text-muted">
        Step {index + 1} / {STEPS.length}
      </div>
    </div>
  );
}
