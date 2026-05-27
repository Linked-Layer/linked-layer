import { type Variants, motion } from "framer-motion";

const container = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const wordUp: Variants = {
  hidden: { y: "120%", opacity: 0, filter: "blur(6px)" },
  show: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Reveals a string word-by-word: each word rises out of a mask with a blur
 * fade and a stagger. The signature "beautiful text appearing" effect.
 */
export function WordReveal({
  text,
  className,
  stagger = 0.05,
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      variants={container(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden>
          <motion.span variants={wordUp} className="inline-block">
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/**
 * Reveals a string character-by-character (rise + blur, staggered), grouped by
 * word so lines only ever break at spaces. Played on mount, so each journey
 * chapter swap animates in distinctly from the section reveals.
 */
export function CharReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  let n = 0;
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {[...word].map((c) => {
            const d = n++;
            return (
              <motion.span
                key={d}
                className="inline-block"
                initial={{ y: "70%", opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: d * 0.035, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
              >
                {c}
              </motion.span>
            );
          })}
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Soft fade-in for supporting copy (lines), with a gentle upward drift. */
export function LineReveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
