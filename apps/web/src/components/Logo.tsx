import { cn } from "@/lib/utils";

/** Linked Layer brand mark — the angular layered glyph on its dark tile (provided logo). */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={cn("h-7 w-auto rounded-lg", className)} />;
}

export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-ink">
        Linked <span className="gradient-text">Layer</span>
      </span>
    </span>
  );
}
