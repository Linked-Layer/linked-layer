import { cn } from "@/lib/utils";

/** Linked Layer mark — a small node graph (shared memory) inside a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-8 w-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="mnemo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#0d0d16" stroke="url(#mnemo-g)" strokeWidth="2" />
      <g stroke="url(#mnemo-g)" strokeWidth="2" strokeLinecap="round">
        <line x1="15" y1="33" x2="15" y2="17" />
        <line x1="15" y1="17" x2="24" y2="26" />
        <line x1="24" y1="26" x2="33" y2="17" />
        <line x1="33" y1="17" x2="33" y2="33" />
      </g>
      <g fill="url(#mnemo-g)">
        <circle cx="15" cy="17" r="3" />
        <circle cx="24" cy="26" r="3" />
        <circle cx="33" cy="17" r="3" />
        <circle cx="15" cy="33" r="2.4" />
        <circle cx="33" cy="33" r="2.4" />
      </g>
    </svg>
  );
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
