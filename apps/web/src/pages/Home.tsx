import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhitepaperSection } from "@/pages/Whitepaper";
import { NavContext, type View } from "@/providers/Nav";
import { AskCompanyDemo } from "@/sections/AskCompanyDemo";
import { CTA } from "@/sections/CTA";
import { HowItWorks } from "@/sections/HowItWorks";
import { Integrations } from "@/sections/Integrations";
import { Journey } from "@/sections/Journey";
import { Roadmap } from "@/sections/Roadmap";

/**
 * Single-document app: each nav item is a SEPARATE view, swapped in place via
 * state — no route change — so the header (and the connected wallet) never
 * unmounts and the URL stays at the root.
 */
export function Home() {
  const [view, setView] = useState<View>("home");

  const navigate = (next: View) => setView(next);

  // Jump to the top whenever the view changes.
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [view]);

  return (
    <NavContext.Provider value={{ view, navigate }}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === "home" && <HomeView />}
              {view === "chat" && <Padded><AskCompanyDemo /></Padded>}
              {view === "roadmap" && <Padded><Roadmap /></Padded>}
              {view === "whitepaper" && <Padded><WhitepaperSection /></Padded>}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </NavContext.Provider>
  );
}

/** The landing view (the cinematic intro + supporting sections). */
function HomeView() {
  return (
    <>
      <Journey />
      <HowItWorks />
      <Integrations />
      <CTA />
    </>
  );
}

/** Offsets inner views below the fixed header. */
function Padded({ children }: { children: React.ReactNode }) {
  return <div className="pt-16">{children}</div>;
}
