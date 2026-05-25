import type { DistilledFact } from "./pipeline";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_/]+/g, " ") // treat hyphen/underscore/slash as word separators
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drop near-duplicate facts (same kind + highly overlapping summary). Keeps the
 * first occurrence, which — given ingest order — tends to be the canonical one.
 */
export function dedupeFacts(facts: DistilledFact[]): DistilledFact[] {
  const seen: { kind: string; tokens: Set<string> }[] = [];
  const out: DistilledFact[] = [];

  for (const fact of facts) {
    const tokens = new Set(normalize(fact.summary).split(" ").filter(Boolean));
    const dup = seen.some((s) => s.kind === fact.kind && jaccard(s.tokens, tokens) >= 0.8);
    if (dup) continue;
    seen.push({ kind: fact.kind, tokens });
    out.push(fact);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
