import { useEffect, useLayoutEffect, useState } from "react";

export interface OnboardingStep {
  /** Resolve the element to spotlight at the moment the step is shown. */
  getEl: () => HTMLElement | null;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 300;

/**
 * First-run product tour: dims the screen, spotlights one target element at a time
 * (via a big box-shadow "hole"), and shows a coach-mark with the hint. Steps whose
 * element isn't present are skipped. Calling onClose persists nothing — the caller
 * decides whether to set the "seen" flag.
 */
export function Onboarding({ steps, onClose }: { steps: OnboardingStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[i];
  const next = () => (i < steps.length - 1 ? setI(i + 1) : onClose());

  // Measure the current target (and re-measure on resize). Skip ahead past any
  // step whose element has gone missing.
  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = step.getEl();
      if (!el) {
        if (i < steps.length - 1) setI((n) => n + 1);
        else onClose();
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [i, step, steps.length, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" || e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!step || !rect) return null;

  const last = i === steps.length - 1;

  // Spotlight box (the real element shows through; everything else is dimmed).
  const sx = rect.left - PAD;
  const sy = rect.top - PAD;
  const sw = rect.width + PAD * 2;
  const sh = rect.height + PAD * 2;

  // Place the card below the target, or above it when the target sits low.
  const below = rect.top + rect.height / 2 < window.innerHeight * 0.55;
  const cardLeft = Math.max(12, Math.min(window.innerWidth - CARD_W - 12, rect.left + rect.width / 2 - CARD_W / 2));
  const cardTop = below ? sy + sh + 12 : undefined;
  const cardBottom = below ? undefined : window.innerHeight - sy + 12;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* click-blocker so the app behind stays inert during the tour */}
      <div className="absolute inset-0" onClick={next} />

      {/* spotlight — dims the rest of the screen via a huge box-shadow */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-violet/70 transition-all duration-300"
        style={{
          top: sy,
          left: sx,
          width: sw,
          height: sh,
          boxShadow: "0 0 0 9999px rgba(3,3,10,0.78), 0 0 24px 4px rgba(124,92,255,0.35)",
        }}
      />

      {/* coach-mark */}
      <div
        className="absolute w-[300px] rounded-2xl border border-border bg-panel p-4 shadow-glow backdrop-blur"
        style={{ left: cardLeft, top: cardTop, bottom: cardBottom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-violet" : "w-1.5 bg-border"}`} />
          ))}
        </div>
        <h3 className="text-sm font-semibold text-white">{step.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-muted transition-colors hover:text-slate-200">
            Skip
          </button>
          <button
            onClick={next}
            className="rounded-lg bg-violet px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet/90"
          >
            {last ? "Got it" : `Next (${i + 1}/${steps.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
