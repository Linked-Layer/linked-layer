/** Frontend runtime config from Vite env (build-time inlined). */
const env = import.meta.env;

// In a production build with no explicit VITE_API_URL, the app is served by the
// backend itself (single container) → talk to the API on the same origin.
const rawApiUrl = (env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const sameOrigin = env.PROD && typeof window !== "undefined" ? window.location.origin : "";

export const config = {
  /** Backend Context API base URL. Empty (dev, no backend) → scripted fallback. */
  apiUrl: rawApiUrl || sameOrigin,
  /**
   * Pre-token "soft launch": site is live but the chat runs as a scripted demo and
   * the wallet gate is OFF (no real $LINKED check). Flip to false at token launch.
   */
  softLaunch: ((env.VITE_SOFT_LAUNCH as string | undefined) ?? "") === "true",
  /**
   * DEMO/QA unlock: show the live wallet-gated chat (Connect → Verify → ask) even
   * before the token lists, so the flow can be recorded/tested. Pair with backend
   * secrets GATING_PROVIDER=stub + GATING_MIN_BALANCE=0 so any signed wallet passes.
   * MUST be false in production (the real $LINKED gate replaces it at launch).
   */
  demoUnlock: ((env.VITE_DEMO_UNLOCK as string | undefined) ?? "") === "true",
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
