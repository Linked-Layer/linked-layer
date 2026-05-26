/**
 * Brand / token identity — the single source of truth for naming.
 * Change the project name or ticker here (env can override at runtime).
 */
export interface Brand {
  /** Human-facing product name. */
  name: string;
  /** Token ticker without the `$` prefix. */
  ticker: string;
  /** `$`-prefixed ticker for display. */
  symbol: string;
  /** On-chain mint address (stub until chain integration). */
  mint: string;
}

// MNEMO_* is the current naming; RECALL_* kept as a fallback for older envs.
const ticker = process.env.MNEMO_TOKEN_TICKER ?? process.env.RECALL_TOKEN_TICKER ?? "LINKED";

export const BRAND: Brand = {
  name: process.env.MNEMO_TOKEN_NAME ?? process.env.RECALL_TOKEN_NAME ?? "Linked Layer",
  ticker,
  symbol: `$${ticker}`,
  mint: process.env.MNEMO_TOKEN_MINT ?? process.env.RECALL_TOKEN_MINT ?? "stub-mint-address",
};
