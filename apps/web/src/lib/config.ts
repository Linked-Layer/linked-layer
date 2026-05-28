/** Frontend runtime config from Vite env (build-time inlined). */
const env = import.meta.env;

// In a production build with no explicit VITE_API_URL, the app is served by the
// backend itself (single container) → talk to the API on the same origin.
const rawApiUrl = (env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const sameOrigin = env.PROD && typeof window !== "undefined" ? window.location.origin : "";

export const config = {
  /** Backend Context API base URL. Empty (dev, no backend) → scripted fallback. */
  apiUrl: rawApiUrl || sameOrigin,
  /** Public, read-only demo API key (rate-limited) for the "ask the company" widget. */
  demoKey: (env.VITE_DEMO_KEY as string | undefined) ?? "",
  /** Demo workspace slug. */
  demoWorkspace: (env.VITE_DEMO_WORKSPACE as string | undefined) ?? "acme",

  /** Solana JSON-RPC endpoint for live network stats (must be browser/CORS-friendly). */
  solanaRpc: (env.VITE_SOLANA_RPC as string | undefined) ?? "https://solana-rpc.publicnode.com",

  /** $LINKED token contract address (mint). Empty → pre-launch placeholder stats. */
  tokenCa: (env.VITE_TOKEN_CA as string | undefined) ?? "",

  /** Reown AppKit project id (cloud.reown.com). Empty → wallet button shows a hint. */
  reownProjectId: (env.VITE_REOWN_PROJECT_ID as string | undefined) ?? "",

  /** Social / external links (placeholders until the manager provides them). */
  links: {
    twitter: (env.VITE_TWITTER_URL as string | undefined) ?? "https://x.com",
    dexscreener:
      (env.VITE_DEX_URL as string | undefined) ??
      (env.VITE_TOKEN_CA ? `https://dexscreener.com/solana/${env.VITE_TOKEN_CA}` : "https://dexscreener.com"),
    docs: (env.VITE_DOCS_URL as string | undefined) ?? "/whitepaper",
  },
} as const;

export const isLive = {
  api: () => config.apiUrl.length > 0,
  token: () => config.tokenCa.length > 0,
  wallet: () => config.reownProjectId.length > 0,
};
