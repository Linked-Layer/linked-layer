import type { RawItem, SourceType } from "@recall/core";

export interface PullContext {
  /** Workspace slug being synced. */
  workspace: string;
  /** Connector-specific config (tokens env names, repo names, channels, ...). */
  config: Record<string, unknown>;
  /** Opaque incremental-sync state returned by the previous pull (per source). */
  cursor?: Record<string, unknown>;
}

export interface PullResult {
  /** Normalized items to persist into `raw_ingest` (idempotent by externalId). */
  items: RawItem[];
  /** New opaque cursor to persist for the next incremental pull. */
  cursor?: Record<string, unknown>;
}

/**
 * A source connector. `pull()` returns normalized {@link RawItem}s plus an opaque
 * cursor for incremental sync. `audience` on each item becomes the ACL —
 * permissions mirror the source.
 */
export interface Connector {
  readonly sourceType: SourceType;
  pull(ctx: PullContext): Promise<PullResult>;
}

/** Thrown by connectors that are missing required config (e.g. token/repos). */
export class ConnectorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorConfigError";
  }
}

/**
 * Resolve a bearer token. A literal `config.token` (used by per-user connectors,
 * passed in decrypted at sync time) wins; otherwise read the env var named in
 * `config.tokenEnv` (default `fallbackEnv`) — for server-configured connectors.
 */
export function resolveToken(config: Record<string, unknown>, fallbackEnv: string): string {
  const literal = config.token;
  if (typeof literal === "string" && literal.length > 0) return literal;
  const envName = (config.tokenEnv as string | undefined) ?? fallbackEnv;
  const token = process.env[envName];
  if (!token) {
    throw new ConnectorConfigError(`Missing token: set the ${envName} env var (or config.tokenEnv)`);
  }
  return token;
}
