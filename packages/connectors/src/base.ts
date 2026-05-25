import type { RawItem, SourceType } from "@recall/core";

export interface PullContext {
  /** Workspace slug being synced. */
  workspace: string;
  /** Connector-specific config (tokens, repo names, channels, ...). */
  config: Record<string, unknown>;
  /** Only return items created/updated after this cursor, if supported. */
  since?: Date;
}

/**
 * A source connector. `pull()` returns normalized {@link RawItem}s; the worker
 * persists them to `raw_ingest` (idempotent by externalId) and the distill/embed
 * stages take over. `audience` on each item becomes the ACL — permissions mirror
 * the source.
 */
export interface Connector {
  readonly sourceType: SourceType;
  pull(ctx: PullContext): Promise<RawItem[]>;
}

/** Thrown by stub connectors that are not implemented in this iteration. */
export class ConnectorNotImplementedError extends Error {
  constructor(sourceType: SourceType) {
    super(`Connector "${sourceType}" is a stub — real OAuth ingest is not implemented yet.`);
    this.name = "ConnectorNotImplementedError";
  }
}
