import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/Section";

const QA: { q: string; a: string }[] = [
  {
    q: "Do I need to hold $LINKED to try it?",
    a: "No — connect a wallet and verify to ask 10 questions free. Holding $LINKED unlocks unlimited access, higher capacity tiers and private namespaces.",
  },
  {
    q: "Is my data exposed to other holders?",
    a: "Never. Retrieval is permission-filtered at query time: you only ever see what your identity is allowed to see in the source tool. Access fails closed — if entitlement can't be confirmed, context is simply not returned.",
  },
  {
    q: "Which tools does it connect?",
    a: "GitHub and Notion are live today, with Slack, Drive, Linear, Jira, calls and CRM on the way. The connector model is uniform, so new sources slot in without re-architecting the graph.",
  },
  {
    q: "How do agents use it?",
    a: "Agents authenticate with a scoped key or wallet session and call recall() over MCP (or REST) before they reason. They inherit exactly the visibility of the identity that invoked them — never more.",
  },
  {
    q: "How do agents pay?",
    a: "Per call via x402 (USDC / $LINKED) when usage-based billing applies. Fees route to the treasury, which buys back and burns $LINKED over time.",
  },
  {
    q: "Is it just a chatbot?",
    a: "No — it's a memory layer. The “ask the company” chat is one interface; agents use the same recall primitive through MCP and the Context API.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section eyebrow="FAQ" title="Questions, answered" subtitle="The short version — the whitepaper has the long one.">
      <div className="mx-auto max-w-3xl space-y-3">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-2xl border bg-panel transition-colors ${
                isOpen ? "border-accent/40 shadow-card" : "border-border"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-base font-medium text-ink">{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25, ease }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isOpen ? "bg-accent text-white" : "bg-panel-2 text-muted"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
