import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { CharReveal } from "@/components/AnimatedText";
import { MorphField } from "@/components/MorphField";
import { Button } from "@/components/ui/button";
import { useNav } from "@/providers/Nav";

interface Chapter {
  kicker: string;
  word: string;
  sentence?: string;
  hint?: string;
  cta?: boolean;
}

const CHAPTERS: Chapter[] = [
  { kicker: "Context, on demand", word: "Linked Layer", hint: "Scroll to start" },
  {
    kicker: "For people & agents",
    word: "Total recall",
    sentence: "One call — recall(query, scope) — returns your team's memory, permission-aware.",
  },
  {
    kicker: "Every decision, the why, the status",
    word: "Ask the company",
    sentence: "Chat over everything your team knows — answered with cited sources.",
  },
  {
    kicker: "Slack · GitHub · docs · calls",
    word: "One Layer, Every Tool",
    sentence: "Your tools, distilled into a single permission-aware context graph.",
    cta: true,
  },
];

export function Journey() {
  const { navigate } = useNav();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = CHAPTERS.length;
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(n - 1, Math.floor(v * n - 0.0001))));
  });
  // "Scroll to start" lives only at the very top — it fades out the moment you
  // scroll and the "M" begins to form.
  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  const c = CHAPTERS[active]!;
  // First chapter is a bare full-screen title (no glass) — so "Scroll to start"
  // reads as the intro. From the 2nd chapter on, the text settles into the glass card.
  const isIntro = active === 0;
  // Only the intro (chapter 0, the "M") is bare full-screen text; from "Total recall"
  // onward the text settles into the glass + edge-light card.
  const glassOn = !isIntro;

  return (
    <section ref={ref} style={{ height: `${n * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Particles assemble into themed shapes per chapter */}
        <MorphField progress={scrollYProgress} chapters={n} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/20 via-transparent to-bg/70" />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50, filter: "blur(12px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
          >
            <motion.div
              initial={glassOn ? { scale: 1.06, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={
                glassOn
                  ? "relative w-full max-w-4xl rounded-[2.25rem] border border-white/[0.06] bg-white/[0.008] px-8 py-14 shadow-2xl ring-1 ring-white/[0.03] backdrop-blur-md md:px-20 md:py-24"
                  : "relative w-full max-w-5xl"
              }
            >
              {glassOn && (
                <>
                  {/* accent edge-light — top (violet) & bottom (cyan), brightest at center, glowing the text */}
                  <span aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-violet to-transparent" />
                  <span aria-hidden className="pointer-events-none absolute inset-x-24 top-0 h-16 rounded-[100%] bg-violet/30 blur-2xl" />
                  <span aria-hidden className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />
                  <span aria-hidden className="pointer-events-none absolute inset-x-24 bottom-0 h-16 rounded-[100%] bg-cyan/25 blur-2xl" />
                </>
              )}
            <motion.div
              className="relative mb-2 text-sm font-medium tracking-[0.25em] text-violet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {c.kicker.toUpperCase()}
            </motion.div>

            <h2
              className={`font-serif font-light leading-[0.95] text-white ${
                isIntro ? "text-[16vw] md:text-[8.5rem]" : "text-[13vw] md:text-[6rem]"
              }`}
            >
              <CharReveal text={c.word} />
            </h2>

            {c.sentence && (
              <motion.p
                className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg"
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.35 }}
              >
                {c.sentence}
              </motion.p>
            )}

            {c.hint && (
              <motion.p className="mt-10 text-sm tracking-[0.2em] text-muted" style={{ opacity: hintOpacity }}>
                <motion.span
                  className="inline-block"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  {c.hint}
                </motion.span>
              </motion.p>
            )}

            {c.cta && (
              <motion.div
                className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Button size="lg" onClick={() => navigate("chat")}>
                  Open chat <ArrowUpRight className="h-4 w-4" />
                </Button>
                <a href="#how">
                  <Button variant="outline" size="lg">
                    How it works
                  </Button>
                </a>
              </motion.div>
            )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <DiamondRail active={active} total={n} />
      </div>
    </section>
  );
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
