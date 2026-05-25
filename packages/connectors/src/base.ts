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

/** Read a bearer token from the env var named in config (default `fallbackEnv`). */
export function resolveToken(config: Record<string, unknown>, fallbackEnv: string): string {
  const envName = (config.tokenEnv as string | undefined) ?? fallbackEnv;
  const token = process.env[envName];
  if (!token) {
    throw new ConnectorConfigError(`Missing token: set the ${envName} env var (or config.tokenEnv)`);
  }
  return token;
}
