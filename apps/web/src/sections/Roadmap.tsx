import { Check, Circle, Loader2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";

type Status = "done" | "active" | "next";

const PHASES: { phase: string; title: string; items: string[]; status: Status }[] = [
  {
    phase: "Phase 1",
    title: "Context engine",
    status: "done",
    items: [
      "Permission-aware context graph (Postgres + pgvector)",
      "LLM distillation, MCP server + Context API",
      "API-key auth, multi-tenancy, rate limiting",
    ],
  },
  {
    phase: "Phase 2",
    title: "Connectors & scale",
    status: "active",
    items: ["GitHub & Slack live connectors", "Scheduled incremental sync", "Drive / Notion / Linear / Jira"],
  },
  {
    phase: "Phase 3",
    title: "Token launch",
    status: "next",
    items: ["$LINKED on Solana", "Hold-to-use gating live", "x402 pay-per-call settlement"],
  },
  {
    phase: "Phase 4",
    title: "Agent ecosystem",
    status: "next",
    items: ["Public agent marketplace", "Buyback & burn automation", "Namespaces & capacity tiers"],
  },
];

const ICON: Record<Status, JSX.Element> = {
  done: <Check className="h-4 w-4" />,
  active: <Loader2 className="h-4 w-4 animate-spin" />,
  next: <Circle className="h-4 w-4" />,
};

export function Roadmap() {
  return (
    <Section id="roadmap" eyebrow="Roadmap" title="Where we're headed">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((p, i) => (
          <Reveal key={p.phase} delay={i * 0.08}>
            <div className="panel h-full p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet">{p.phase}</span>
                <span
                  className={
                    p.status === "done"
                      ? "text-emerald-400"
                      : p.status === "active"
                        ? "text-cyan"
                        : "text-muted"
                  }
                >
                  {ICON[p.status]}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{p.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
