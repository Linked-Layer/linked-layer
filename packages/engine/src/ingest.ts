import type { SourceType } from "@recall/core";
import {
  ensureWorkspace,
  getConnectorRow,
  insertRawItems,
  updateConnectorCursor,
  upsertConnectorConfig,
} from "@recall/db";
import { getConnector } from "@recall/connectors";

export interface SyncParams {
  workspaceSlug: string;
  workspaceName?: string;
  sourceType: SourceType;
  /** Optional config to upsert before syncing (else uses the stored config). */
  config?: Record<string, unknown>;
}

export interface SyncResult {
  workspaceId: string;
  pulled: number;
}

/**
 * Pull from a connector using its stored config + incremental cursor, persist to
 * `raw_ingest` (idempotent), and advance the cursor. Does NOT run distill/embed
 * — that is the pipeline stage, triggered separately.
 */
export async function syncConnector(params: SyncParams): Promise<SyncResult> {
  const workspaceId = await ensureWorkspace(params.workspaceSlug, params.workspaceName ?? params.workspaceSlug);

  // Resolve config: incoming wins; else stored; else empty. Always persist a row
  // so the cursor + last_sync are tracked uniformly (sample included).
  const existing = await getConnectorRow(workspaceId, params.sourceType);
  const config = params.config ?? (existing?.config as Record<string, unknown> | undefined) ?? {};
  if (!existing || params.config) {
    await upsertConnectorConfig(workspaceId, params.sourceType, config);
  }
  const row = (await getConnectorRow(workspaceId, params.sourceType))!;

  const connector = getConnector(params.sourceType);
  const result = await connector.pull({
    workspace: params.workspaceSlug,
    config,
    cursor: row.cursor as Record<string, unknown>,
  });

  const pulled = await insertRawItems(workspaceId, result.items);
  await updateConnectorCursor(row.id, result.cursor ?? (row.cursor as Record<string, unknown>), new Date());

  return { workspaceId, pulled };
}
