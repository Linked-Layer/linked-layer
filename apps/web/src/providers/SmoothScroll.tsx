import Lenis from "lenis";
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/**
 * Buttery smooth scrolling (Lenis) — the signature "landing.love" scroll feel.
 * Also intercepts in-page anchor clicks for eased scrolling, and resets on route change.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenisState, setLenisState] = useState<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenisRef.current = lenis;
    setLenisState(lenis);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"], a[href^="/#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const hash = a.getAttribute("href")!.replace(/^\/?#/, "#");
      const el = hash.length > 1 ? document.querySelector(hash) : null;
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -72 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
      lenisRef.current = null;
      setLenisState(null);
    };
  }, []);

  // Jump to top on route change (and to anchor if present).
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        lenis.scrollTo(el as HTMLElement, { offset: -72, immediate: false });
        return;
      }
    }
    lenis.scrollTo(0, { immediate: true });
  }, [location.pathname, location.hash]);

  return <LenisContext.Provider value={lenisState}>{children}</LenisContext.Provider>;
}
