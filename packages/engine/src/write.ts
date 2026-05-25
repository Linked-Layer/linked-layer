import type { WriteRequestInput } from "@recall/core";
import {
  deleteChunksForNode,
  deleteDistillationsForNode,
  getWorkspaceIdBySlug,
  insertChunk,
  insertDistillation,
  setAcl,
  upsertNode,
} from "@recall/db";
import { chunkText, getEmbeddingProvider } from "@recall/embed";
import { distillItem } from "@recall/distill";

/**
 * Write / annotate memory directly (not via a connector). Creates a node,
 * mirrors `audience` into the ACL, distills if it's a decision/action item, and
 * embeds it so it's immediately retrievable by recall().
 */
export async function writeMemory(input: WriteRequestInput): Promise<{ nodeId: string }> {
  const workspaceId = await getWorkspaceIdBySlug(input.workspace);
  if (!workspaceId) throw new Error(`Unknown workspace: ${input.workspace}`);

  const nodeId = await upsertNode({
    workspaceId,
    kind: input.kind,
    sourceType: null,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
  });

  await setAcl(workspaceId, nodeId, input.audience);

  const distilledLines: string[] = [];
  await deleteDistillationsForNode(nodeId);
  if (input.kind === "decision" || input.kind === "action_item") {
    const facts = await distillItem({ title: input.title, body: input.body, kind: input.kind, metadata: input.metadata });
    for (const fact of facts) {
      await insertDistillation({
        workspaceId,
        nodeId,
        kind: fact.kind,
        summary: fact.summary,
        rationale: fact.rationale,
        status: fact.status,
        sources: [nodeId],
        metadata: fact.assignee ? { assignee: fact.assignee } : {},
      });
      const who = fact.assignee ? ` (owner ${fact.assignee})` : "";
      distilledLines.push(`${fact.summary}${fact.rationale ? ` — why: ${fact.rationale}` : ""}${who} [${fact.status}]`);
    }
  }

  const text = [input.title, input.body, ...distilledLines].filter(Boolean).join("\n");
  const chunks = chunkText(text);
  const vectors = await getEmbeddingProvider().embed(chunks);
  await deleteChunksForNode(nodeId);
  for (let i = 0; i < chunks.length; i++) {
    await insertChunk(workspaceId, nodeId, chunks[i]!, vectors[i] ?? null);
  }

  return { nodeId };
}
