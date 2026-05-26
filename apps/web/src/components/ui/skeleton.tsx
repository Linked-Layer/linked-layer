import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shimmer skeleton placeholder (see `.skeleton` in index.css). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
