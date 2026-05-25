import type { SourceType } from "@recall/core";
import { getWorkspaceIdBySlug, listConnectorRows } from "@recall/db";

export interface ConnectorSummary {
  sourceType: SourceType;
  config: Record<string, unknown>;
  enabled: boolean;
  lastSyncAt: string | null;
}

/** List a workspace's configured connectors (config holds env-var names, not secrets). */
export async function listConnectors(workspaceSlug: string): Promise<ConnectorSummary[]> {
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);
  if (!workspaceId) return [];
  const rows = await listConnectorRows(workspaceId);
  return rows.map((r) => ({
    sourceType: r.sourceType as SourceType,
    config: r.config as Record<string, unknown>,
    enabled: r.enabled,
    lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null,
  }));
}
