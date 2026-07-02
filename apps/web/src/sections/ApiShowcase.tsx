import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare, PenLine } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Section } from "@/components/Section";

interface Tab {
  key: string;
  label: string;
  icon: ReactNode;
  blurb: string;
  code: ReactNode;
}

const ease = [0.22, 1, 0.36, 1] as const;

const c = {
  k: (s: string) => <span className="text-accent">{s}</span>, // keyword / call
  s: (s: string) => <span className="text-emerald-600 dark:text-emerald-400">{s}</span>, // string
  d: (s: string) => <span className="text-muted">{s}</span>, // dim / comment
};

const TABS: Tab[] = [
  {
    key: "ask",
    label: "Ask (people)",
    icon: <MessageSquare className="h-4 w-4" />,
    blurb: "Teammates ask in plain language and get a streamed, cited answer over the same memory.",
    code: (
      <>
        {c.d("// stream a cited answer for a human")}
        {"\n"}
        {c.k("POST")} /v1/ask
        {"\n"}
        {"{"}
        {"\n  "}
        {c.s('"question"')}: {c.s('"What did we decide about pricing?"')},
        {"\n  "}
        {c.s('"scope"')}: {"{ "}
        {c.s('"workspace"')}: {c.s('"team"')}
        {" }"}
        {"\n"}
        {"}"}
      </>
    ),
  },
  {
    key: "recall",
    label: "recall (agents)",
    icon: <Bot className="h-4 w-4" />,
    blurb: "Agents call one primitive over MCP before they act — bounded by the caller's permissions.",
    code: (
      <>
        {c.d("// agent pulls permission-bounded context")}
        {"\n"}
        {c.k("await")} linked.{c.k("recall")}({"{"}
        {"\n  "}query: {c.s('"owner of the billing migration"')},
        {"\n  "}scope: {"{ "}workspace: {c.s('"team"')}{" }"},
        {"\n  "}topK: 8,
        {"\n"}
        {"}"})
      </>
    ),
  },
  {
    key: "write",
    label: "write",
    icon: <PenLine className="h-4 w-4" />,
    blurb: "Append a decision, action item or note that becomes immediately retrievable for everyone.",
    code: (
      <>
        {c.d("// record a decision into the graph")}
        {"\n"}
        {c.k("await")} linked.{c.k("write")}({"{"}
        {"\n  "}type: {c.s('"decision"')},
        {"\n  "}title: {c.s('"Adopt Solana for x402"')},
        {"\n  "}audience: [{c.s('"eng"')}, {c.s('"product"')}],
        {"\n"}
        {"}"})
      </>
    ),
  },
];

export function ApiShowcase() {
  const [active, setActive] = useState(0);
  const tab = TABS[active]!;

  return (
    <Section
      eyebrow="One API"
      title="The same memory, however you reach it"
      subtitle="A single primitive — recall(query, scope) — serves people and agents alike. No SDK lock-in: any MCP client works, and the REST surface is a handful of plain HTTP endpoints."
    >
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        {/* tab selector + blurb */}
        <div className="space-y-2">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActive(i)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                i === active
                  ? "border-accent/50 bg-accent/[0.06] shadow-sm"
                  : "border-border bg-panel hover:border-accent/30"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  i === active ? "bg-accent text-white" : "bg-panel-2 text-muted"
                }`}
              >
                {t.icon}
              </span>
              <span>
                <span className="block font-mono text-sm font-medium text-ink">{t.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>

        {/* animated code panel */}
        <div className="rounded-2xl border border-border bg-panel shadow-glow">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="ml-2 font-mono text-xs text-muted">linked · context API</span>
          </div>
          <div className="relative min-h-[200px] overflow-hidden p-4">
            <AnimatePresence mode="wait">
              <motion.pre
                key={tab.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease }}
                className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-ink"
              >
                {tab.code}
              </motion.pre>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  );
}
