import { motion } from "framer-motion";
import { Boxes, Coins, FileCheck2, GitBranch, Plug, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Section } from "@/components/Section";

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  /** Span two columns on large screens for a bento rhythm. */
  wide?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Permission-aware by default",
    desc: "Every item inherits the audience of its source. Retrieval is filtered through that ACL at query time and fails closed — Linked never surfaces to a person or an agent anything they couldn't already see in the original tool.",
    wide: true,
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "One primitive, two audiences",
    desc: "People ask in plain language; agents call recall() over MCP. Same memory, same permission bounds.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Always-current graph",
    desc: "Projects, people, decisions and threads stay fresh through incremental sync — deduped, never stale.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Cited & traceable",
    desc: "Every answer links back to the exact source nodes it used, so claims are auditable — not opaque.",
  },
  {
    icon: <Plug className="h-5 w-5" />,
    title: "Connects your whole stack",
    desc: "Slack, GitHub, Notion, Drive, Linear, Jira, calls and CRM ingest into one place — permissions mirrored from each source, more connectors landing every month.",
    wide: true,
  },
  {
    icon: <Coins className="h-5 w-5" />,
    title: "Token-gated & pay-per-call",
    desc: "Hold $LINKED to use the layer; external agents pay per recall() via x402. Fees fuel buyback & burn.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Why Linked"
      title="Memory your team and agents can trust"
      subtitle="Not another search box. A living, permission-bounded layer that turns scattered activity into answers — for the humans on your team and the agents working beside them."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease }}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-card transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-glow ${
              f.wide ? "lg:col-span-2" : ""
            }`}
          >
            {/* hover wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-accent/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
            <div className="relative">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
