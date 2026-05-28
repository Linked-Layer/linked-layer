import { cn } from "@/lib/utils";

/** Linked Layer brand mark (gradient monogram, generated from the provided logo). */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden="true" className={cn("h-7 w-auto", className)} />;
}

export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-white">
        Linked Layer <span className="gradient-text">Layer</span>
      </span>
    </span>
  );
}
