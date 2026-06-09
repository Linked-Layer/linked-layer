/**
 * Central runtime config, read from environment.
 * Keep all env access here so the rest of the codebase stays testable.
 */

// Load a local .env if present (Node >=20.6), dependency-free. Real env vars win.
try {
  (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }).loadEnvFile?.();
} catch {
  // no .env file — fine, fall back to process.env / defaults
}

function str(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export const config = {
  databaseUrl: str("DATABASE_URL", "postgres://recall:recall@localhost:5432/recall"),
  redisUrl: str("REDIS_URL", "redis://localhost:6379"),

  api: {
    host: str("API_HOST", "0.0.0.0"),
    port: int("API_PORT", 8080),
    logLevel: str("LOG_LEVEL", "info"),
    rateLimitMax: int("RATE_LIMIT_MAX", 120),
    rateLimitWindowMs: int("RATE_LIMIT_WINDOW_MS", 60_000),
    /** Allowed CORS origins: "*" or a comma-separated allow-list of exact origins. */
    corsOrigins: str("CORS_ORIGINS", "*"),
    /** Built frontend dir to serve (single-container deploy). Empty → API only. */
    webDir: str("WEB_DIST_DIR", ""),
  },

  /** Background connector sync interval (ms). 0 disables the scheduler. */
  sync: {
    intervalMs: int("SYNC_INTERVAL_MS", 0),
  },

  /**
   * LLM provider for "ask" (streamed answers) and distillation.
   *   LLM_PROVIDER=anthropic  → ANTHROPIC_API_KEY, Claude models
   *   LLM_PROVIDER=perplexity → PERPLEXITY_API_KEY, Sonar models (OpenAI-compatible)
   * No key → heuristic / extractive fallback (pipeline still runs offline).
   */
  llm: (() => {
    const provider = str("LLM_PROVIDER", "anthropic");
    const isPplx = provider === "perplexity";
    return {
      provider,
      apiKey: (isPplx ? process.env.PERPLEXITY_API_KEY : process.env.ANTHROPIC_API_KEY) ?? "",
      // LLM_MODEL is the new name; DISTILL_MODEL kept as a back-compat fallback.
      model: str("LLM_MODEL", process.env.DISTILL_MODEL ?? (isPplx ? "sonar" : "claude-sonnet-4-6")),
      fastModel: str("LLM_FAST_MODEL", process.env.DISTILL_FAST_MODEL ?? (isPplx ? "sonar" : "claude-haiku-4-5-20251001")),
      // Empty for Anthropic → SDK default; Perplexity → its API base.
      baseUrl: str("LLM_BASE_URL", isPplx ? "https://api.perplexity.ai" : ""),
      maxTokens: int("LLM_MAX_TOKENS", 1024),
    };
  })(),

  embed: {
    provider: str("EMBED_PROVIDER", "stub"), // "voyage" | "stub"
    model: str("EMBED_MODEL", "voyage-3"),
    dim: int("EMBED_DIM", 1024),
    voyageApiKey: process.env.VOYAGE_API_KEY ?? "",
  },

  auth: {
    enabled: bool("AUTH_ENABLED", true),
    /** Admin token guarding key-management endpoints. Empty → endpoints disabled. */
    adminToken: process.env.ADMIN_TOKEN ?? "",
  },

  /** Wallet ownership auth (Sign-In-with-Solana) for the connect-wallet gate. */
  wallet: {
    /** HMAC secret for session tokens. Empty → engine uses an ephemeral per-process one. */
    sessionSecret: process.env.SESSION_SECRET ?? process.env.ADMIN_TOKEN ?? "",
    /** How long a verified session is valid. */
    sessionTtlMs: int("WALLET_SESSION_TTL_MS", 30 * 60_000),
    /** How long a signing challenge stays valid. */
    challengeTtlMs: int("WALLET_CHALLENGE_TTL_MS", 5 * 60_000),
    /** Domain shown in the signed message. */
    siwsDomain: str("WALLET_SIWS_DOMAIN", "linkedlayer.xyz"),
  },

  gating: {
    enabled: bool("GATING_ENABLED", true),
    /** "stub" (config balances) | "solana" (real on-chain SPL balance). */
    provider: str("GATING_PROVIDER", "stub"),
    /** Minimum whole-token balance required (compared against decimal-adjusted UI amount). */
    minBalance: int("GATING_MIN_BALANCE", 1000),
    /** Free preview: calls allowed per verified wallet before hold-to-use kicks in (0 disables). */
    freeTrialCalls: int("FREE_TRIAL_CALLS", 10),
    /** $LINKED SPL mint address — required for the "solana" provider. */
    tokenMint: process.env.MNEMO_TOKEN_MINT ?? process.env.RECALL_TOKEN_MINT ?? "",
    /** Solana JSON-RPC endpoint for on-chain balance reads. */
    rpcUrl: str("SOLANA_RPC_URL", "https://solana-rpc.publicnode.com"),
    /** Stub balances parsed from "holder:balance,holder:balance". */
    stubBalances: str("STUB_BALANCES", ""),
  },

  x402: {
    enabled: bool("X402_ENABLED", false),
    priceUsdc: Number.parseFloat(process.env.X402_PRICE_USDC ?? "0.01"),
    payTo: str("X402_PAY_TO", "stub-treasury-address"),
  },

  github: {
    // NOTE: env names use GH_ (not GITHUB_) — Forgejo reserves the GITHUB_ prefix for secrets.
    /** OAuth App credentials (registered on github.com → Developer settings → OAuth Apps). */
    oauthClientId: process.env.GH_OAUTH_CLIENT_ID ?? "",
    oauthClientSecret: process.env.GH_OAUTH_CLIENT_SECRET ?? "",
    /** OAuth scope. `repo` = public+private; `public_repo` = public only. */
    oauthScope: str("GH_OAUTH_SCOPE", "repo read:user"),
    /** Public origin used to build the OAuth redirect_uri (must match the OAuth App). */
    appBaseUrl: str("PUBLIC_BASE_URL", "https://linkedlayer.xyz"),
  },

  notion: {
    /** Notion public integration OAuth credentials (notion.so/my-integrations). */
    oauthClientId: process.env.NOTION_OAUTH_CLIENT_ID ?? "",
    oauthClientSecret: process.env.NOTION_OAUTH_CLIENT_SECRET ?? "",
  },
} as const;

export type Config = typeof config;
