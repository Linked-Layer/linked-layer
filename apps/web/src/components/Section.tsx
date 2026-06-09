import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { LineReveal, WordReveal } from "@/components/AnimatedText";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-28", className)}>
      {(eyebrow || title || subtitle) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && (
            <motion.div
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-accent"
              initial={{ opacity: 0, letterSpacing: "0.45em" }}
              whileInView={{ opacity: 1, letterSpacing: "0.25em" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {eyebrow}
            </motion.div>
          )}
          {title &&
            (typeof title === "string" ? (
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
                <WordReveal text={title} />
              </h2>
            ) : (
              <LineReveal>
                <h2 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h2>
              </LineReveal>
            ))}
          {subtitle && (
            <LineReveal delay={0.15}>
              <p className="mt-4 text-muted">{subtitle}</p>
            </LineReveal>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
