import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/** Standard inner-page layout with a header, animated entrance, and footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pt-16"
      >
        {children}
      </motion.main>
      <Footer />
    </>
  );
}

/** Page title block for inner pages. */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-2 pt-16 text-center sm:px-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-violet">{eyebrow}</div>
      <h1 className="font-serif text-5xl font-light text-white md:text-6xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-4 max-w-xl text-muted">{subtitle}</p>}
    </div>
  );
}
