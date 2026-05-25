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
import { getEmbeddingProvider } from "@recall/embed";
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
      });
      distilledLines.push(`${fact.summary}${fact.rationale ? ` — why: ${fact.rationale}` : ""} [${fact.status}]`);
    }
  }

  const text = [input.title, input.body, ...distilledLines].filter(Boolean).join("\n");
  const [vec] = await getEmbeddingProvider().embed([text]);
  await deleteChunksForNode(nodeId);
  await insertChunk(workspaceId, nodeId, text.slice(0, 4000), vec ?? null);

  return { nodeId };
}
