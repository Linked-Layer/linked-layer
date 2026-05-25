import type { SourceType } from "@recall/core";
import { ensureWorkspace, insertRawItems } from "@recall/db";
import { getConnector } from "@recall/connectors";

export interface SyncParams {
  workspaceSlug: string;
  workspaceName?: string;
  sourceType: SourceType;
  config?: Record<string, unknown>;
}

export interface SyncResult {
  workspaceId: string;
  pulled: number;
}

/**
 * Pull from a connector and persist to `raw_ingest` (idempotent). Does NOT run
 * distill/embed — that is the pipeline stage, triggered separately.
 */
export async function syncConnector(params: SyncParams): Promise<SyncResult> {
  const workspaceId = await ensureWorkspace(params.workspaceSlug, params.workspaceName ?? params.workspaceSlug);
  const connector = getConnector(params.sourceType);
  const items = await connector.pull({ workspace: params.workspaceSlug, config: params.config ?? {} });
  const pulled = await insertRawItems(workspaceId, items);
  return { workspaceId, pulled };
}
