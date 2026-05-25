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
  },

  llm: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: str("DISTILL_MODEL", "claude-sonnet-4-6"),
    fastModel: str("DISTILL_FAST_MODEL", "claude-haiku-4-5-20251001"),
  },

  embed: {
    provider: str("EMBED_PROVIDER", "stub"), // "voyage" | "stub"
    model: str("EMBED_MODEL", "voyage-3"),
    dim: int("EMBED_DIM", 1024),
    voyageApiKey: process.env.VOYAGE_API_KEY ?? "",
  },

  gating: {
    enabled: bool("GATING_ENABLED", true),
    minBalance: int("GATING_MIN_BALANCE", 1000),
    /** Stub balances parsed from "holder:balance,holder:balance". */
    stubBalances: str("STUB_BALANCES", ""),
  },

  x402: {
    enabled: bool("X402_ENABLED", false),
    priceUsdc: Number.parseFloat(process.env.X402_PRICE_USDC ?? "0.01"),
    payTo: str("X402_PAY_TO", "stub-treasury-address"),
  },
} as const;

export type Config = typeof config;
