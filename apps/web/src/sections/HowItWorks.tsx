import { Boxes, GitBranch, Plug, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const STEPS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <Plug className="h-5 w-5" />,
    title: "1 · Connect sources",
    desc: "Slack, GitHub, Drive/Notion, Linear/Jira, calls and CRM ingest into one place — permissions mirrored from the source.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "2 · Build the graph",
    desc: "A permission-aware context graph of projects, people, decisions, threads and their links, kept current.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "3 · Distill",
    desc: "An LLM continuously extracts decisions, the “why”, action items and statuses — deduped and fresh.",
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "4 · Recall",
    desc: "People ask the company; agents pull context via MCP / Context API in a single recall(query, scope) call.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="From scattered tools to one recall()"
      subtitle="A continuous pipeline turns your team's activity into durable, permission-aware memory."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <Card className="h-full">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet/15 text-violet">
                {s.icon}
              </div>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
