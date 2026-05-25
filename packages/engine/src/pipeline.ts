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
  listDistillationSummaries,
  markRawProcessed,
  setAcl,
  upsertEdge,
  upsertNode,
} from "@recall/db";
import { chunkText, getEmbeddingProvider } from "@recall/embed";
import { distillItem, isNearDuplicate } from "@recall/distill";

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

  // Cross-graph dedup baseline: existing distillation summaries from nodes NOT in
  // this batch (this batch's own distillations are re-deleted below). Grows as we insert.
  const batchNodeIds = new Set(nodeIdByRaw.values());
  const seenSummaries = (await listDistillationSummaries(workspaceId))
    .filter((d) => !batchNodeIds.has(d.nodeId))
    .map((d) => d.summary);

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
      // Skip facts already captured elsewhere in the graph (same decision via
      // multiple sources) so the decision-log stays clean.
      if (isNearDuplicate(fact.summary, seenSummaries)) continue;
      await insertDistillation({
        workspaceId,
        nodeId,
        kind: fact.kind,
        summary: fact.summary,
        rationale: fact.rationale,
        status: fact.status,
        sources: [item.externalId],
        metadata: fact.assignee ? { assignee: fact.assignee } : {},
      });
      seenSummaries.push(fact.summary);
      distillCount++;
      const who = fact.assignee ? ` (owner ${fact.assignee})` : "";
      distilledLines.push(`${fact.summary}${fact.rationale ? ` — why: ${fact.rationale}` : ""}${who} [${fact.status}]`);
    }

    const text = [item.title, item.body, ...distilledLines].filter(Boolean).join("\n");
    touched.push({ nodeId, text });
  }

  // Pass 3: chunk long bodies, embed all chunks in one batch, store per node.
  let chunkCount = 0;
  const allChunks: { nodeId: string; content: string }[] = [];
  for (const { nodeId, text } of touched) {
    for (const content of chunkText(text)) allChunks.push({ nodeId, content });
  }
  if (allChunks.length > 0) {
    const vectors = await embedder.embed(allChunks.map((c) => c.content));
    for (const { nodeId } of touched) await deleteChunksForNode(nodeId);
    for (let i = 0; i < allChunks.length; i++) {
      const c = allChunks[i]!;
      await insertChunk(workspaceId, c.nodeId, c.content, vectors[i] ?? null);
      chunkCount++;
    }
  }

  await markRawProcessed(raw.map((r: RawIngestRow) => r.id));

  return { processed: raw.length, nodes: nodeIdByRaw.size, distillations: distillCount, chunks: chunkCount };
}
