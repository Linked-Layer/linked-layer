import { motion, useScroll, useTransform } from "framer-motion";
import { Boxes, GitBranch, Plug, Sparkles } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Section } from "@/components/Section";

const STEPS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <Plug className="h-5 w-5" />,
    title: "Connect sources",
    desc: "Slack, GitHub, Drive/Notion, Linear/Jira, calls and CRM ingest into one place — permissions mirrored from the source.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Build the graph",
    desc: "A permission-aware context graph of projects, people, decisions and threads — kept current.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Distill",
    desc: "An LLM continuously extracts decisions, the “why”, action items and statuses — deduped and fresh.",
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "Recall",
    desc: "People ask the company; agents pull context via MCP / Context API in one recall(query, scope) call.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  // Fill the connecting line as the section scrolls through the viewport.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="From scattered tools to one recall()"
      subtitle="A continuous pipeline turns your team's activity into durable, permission-aware memory."
    >
      <div ref={ref} className="relative">
        {/* Connecting track: vertical on mobile, horizontal on desktop */}
        <div className="absolute left-6 top-0 h-full w-px bg-border md:left-0 md:top-7 md:h-px md:w-full" />
        {/* Gradient fill that grows with scroll */}
        <motion.div className="absolute left-6 top-0 w-px bg-linked-gradient md:hidden" style={{ height: fill }} />
        <motion.div className="absolute left-0 top-7 hidden h-px bg-linked-gradient md:block" style={{ width: fill }} />

        <div className="relative grid gap-8 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Step key={s.title} index={i} icon={s.icon} title={s.title} desc={s.desc} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function Step({ index, icon, title, desc }: { index: number; icon: ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      className="relative pl-16 md:pl-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* node marker on the line */}
      <div className="absolute left-2 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-violet/60 bg-bg text-sm font-semibold text-violet md:left-3">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="md:mt-16">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet/15 text-violet">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
      </div>
    </motion.div>
  );
}
