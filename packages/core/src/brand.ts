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

const ticker = process.env.RECALL_TOKEN_TICKER ?? "RECALL";

export const BRAND: Brand = {
  name: process.env.RECALL_TOKEN_NAME ?? "Recall",
  ticker,
  symbol: `$${ticker}`,
  mint: process.env.RECALL_TOKEN_MINT ?? "stub-mint-address",
};
