import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SOURCES = ["Slack", "GitHub", "Docs", "Linear", "Calls"];
const ROTATING = ["agents", "copilots", "new hires", "on-call"];

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease },
});

/**
 * Landing hero — a single, centered statement of the product over a soft animated
 * aurora background, with a rotating audience word.
 */
export function Journey() {
  const routerNavigate = useNavigate();

  return (
    <section className="relative flex min-h-svh items-center overflow-hidden">
      <Aurora />
      <GridFade />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-28 text-center sm:px-6">
        <motion.h1
          {...fadeUp(0.06)}
          className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl"
        >
          Shared memory for your team and its <RotatingWord />
        </motion.h1>

        <motion.p {...fadeUp(0.12)} className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Linked Layer turns Slack, GitHub, docs, trackers and calls into one permission-aware context
          graph. One call —{" "}
          <code className="rounded-md bg-panel-2 px-1.5 py-0.5 font-mono text-[0.95em] text-accent">
            recall(query, scope)
          </code>{" "}
          — returns your team's memory. Ask the company in plain language; let agents pull cited context
          through MCP.
        </motion.p>

        <motion.div {...fadeUp(0.18)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => routerNavigate("/app")}>
            Open the chat <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#how">
            <Button variant="outline" size="lg">
              How it works
            </Button>
          </a>
        </motion.div>

        {/* trust strip */}
        <motion.div {...fadeUp(0.24)} className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            ["Permission-aware", "never leaks what a user can't see"],
            ["Cited answers", "every claim traces to its source"],
            ["Agent-native", "MCP + REST, one primitive"],
          ].map(([t, d]) => (
            <div key={t} className="flex items-start gap-2 text-left">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <div className="text-sm font-medium text-ink">{t}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.3)} className="mt-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Connects the tools you use</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SOURCES.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.34 + i * 0.05, ease }}
                className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm font-medium text-ink/80 shadow-sm transition-colors hover:border-accent/40"
              >
                {s}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Slowly drifting, blurred orange blobs behind the hero. Subtle, performant (no canvas). */
function Aurora() {
  const reduce = useReducedMotion();
  const drift = (a: { x: number[]; y: number[]; scale: number[] }, duration: number) =>
    reduce ? undefined : { animate: a, transition: { duration, repeat: Infinity, ease: "easeInOut" as const } };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-accent/15 blur-3xl"
        {...drift({ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }, 18)}
      />
      <motion.div
        className="absolute right-[-10rem] top-10 h-[30rem] w-[30rem] rounded-full bg-accent-2/10 blur-3xl"
        {...drift({ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }, 22)}
      />
    </div>
  );
}

/** Faint fading dot-grid under the hero for depth. */
function GridFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5] [mask-image:radial-gradient(70%_55%_at_50%_0%,#000,transparent)]"
      style={{
        backgroundImage: "radial-gradient(rgb(var(--ink) / 0.06) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}

/** Cycles the audience word in the headline with a soft rise/fall. */
function RotatingWord() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <span className="relative inline-grid">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={ROTATING[i]}
          initial={{ y: "0.6em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.6em", opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          className="text-accent [grid-area:1/1]"
        >
          {ROTATING[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
