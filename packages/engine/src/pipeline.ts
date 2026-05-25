import type { EdgeKind, SourceType } from "@recall/core";
import {
  type RawIngestRow,
  deleteChunksForNode,
  deleteDistillationsForNode,
  getNodeIdByExternal,
  getUnprocessedRaw,
  getWorkspaceIdBySlug,
  insertChunk,
  insertDistillation,
  markRawProcessed,
  setAcl,
  upsertEdge,
  upsertNode,
} from "@recall/db";
import { getEmbeddingProvider } from "@recall/embed";
import { distillItem } from "@recall/distill";

export interface PipelineResult {
  processed: number;
  nodes: number;
  distillations: number;
  chunks: number;
}

interface RawLink {
  kind: EdgeKind;
  toExternalId: string;
}

/**
 * Normalize → distill → embed all unprocessed raw items for a workspace.
 * Idempotent: re-running re-upserts nodes and re-embeds touched nodes.
 */
export async function processWorkspace(workspaceSlug: string, batch = 500): Promise<PipelineResult> {
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);
  if (!workspaceId) throw new Error(`Unknown workspace: ${workspaceSlug}`);

  const raw = await getUnprocessedRaw(workspaceId, batch);
  const embedder = getEmbeddingProvider();

  const touched: { nodeId: string; text: string }[] = [];
  let distillCount = 0;

  // Pass 1: nodes + ACL (so edge targets resolve in pass 2).
  const nodeIdByRaw = new Map<string, string>();
  for (const item of raw) {
    const nodeId = await upsertNode({
      workspaceId,
      kind: item.kind,
      externalId: item.externalId,
      sourceType: item.sourceType as SourceType,
      title: item.title,
      body: item.body,
      metadata: (item.metadata as Record<string, unknown>) ?? {},
    });
    nodeIdByRaw.set(item.id, nodeId);
    await setAcl(workspaceId, nodeId, (item.audience as string[]) ?? []);
  }

  // Pass 2: edges + distillation + embedding text.
  for (const item of raw) {
    const nodeId = nodeIdByRaw.get(item.id)!;

    for (const link of (item.links as RawLink[]) ?? []) {
      const dst = await getNodeIdByExternal(workspaceId, item.sourceType as SourceType, link.toExternalId);
      if (dst) await upsertEdge(workspaceId, link.kind, nodeId, dst);
    }

    const facts = await distillItem({
      title: item.title,
      body: item.body,
      kind: item.kind,
      metadata: (item.metadata as Record<string, unknown>) ?? {},
    });
    const distilledLines: string[] = [];
    await deleteDistillationsForNode(nodeId);
    for (const fact of facts) {
      await insertDistillation({
        workspaceId,
        nodeId,
        kind: fact.kind,
        summary: fact.summary,
        rationale: fact.rationale,
        status: fact.status,
        sources: [item.externalId],
      });
      distillCount++;
      distilledLines.push(`${fact.summary}${fact.rationale ? ` — why: ${fact.rationale}` : ""} [${fact.status}]`);
    }

    const text = [item.title, item.body, ...distilledLines].filter(Boolean).join("\n");
    touched.push({ nodeId, text });
  }

  // Pass 3: embed touched nodes (single batched call).
  let chunkCount = 0;
  if (touched.length > 0) {
    const vectors = await embedder.embed(touched.map((t) => t.text));
    for (let i = 0; i < touched.length; i++) {
      const { nodeId, text } = touched[i]!;
      await deleteChunksForNode(nodeId);
      await insertChunk(workspaceId, nodeId, text.slice(0, 4000), vectors[i] ?? null);
      chunkCount++;
    }
  }

  await markRawProcessed(raw.map((r: RawIngestRow) => r.id));

  return { processed: raw.length, nodes: nodeIdByRaw.size, distillations: distillCount, chunks: chunkCount };
}
