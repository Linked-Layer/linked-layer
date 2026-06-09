import { motion } from "framer-motion";
import { CountUp } from "@/components/motion";

const ease = [0.22, 1, 0.36, 1] as const;

interface Metric {
  value?: number;
  suffix?: string;
  static?: string;
  label: string;
}

const METRICS: Metric[] = [
  { value: 1, label: "call returns your team's memory — recall(query, scope)" },
  { value: 100, suffix: "%", label: "permission-aware retrieval — it fails closed, never leaks" },
  { value: 4, label: "primitives cover everything: recall · search · write · ask" },
];

export function Metrics() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-panel p-8 shadow-card md:p-12">
        <div aria-hidden className="bg-radial-fade pointer-events-none absolute inset-0" />
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
            >
              <div className="text-4xl font-semibold tracking-tight text-accent md:text-5xl">
                {m.static ? (
                  m.static
                ) : (
                  <>
                    <CountUp value={m.value!} format={(n) => Math.round(n).toString()} />
                    {m.suffix}
                  </>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
