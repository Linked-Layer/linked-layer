import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
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
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && (
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-violet">{eyebrow}</div>
          )}
          {title && <h2 className="font-serif text-4xl font-light text-white md:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-4 text-muted">{subtitle}</p>}
        </Reveal>
      )}
      {children}
    </section>
  );
}
