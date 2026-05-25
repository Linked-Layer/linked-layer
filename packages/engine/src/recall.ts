import type { RecallRequest, RecallResult, RecallSource } from "@recall/core";
import { hybridSearch, relevantDistillations } from "@recall/db";
import { getEmbeddingProvider } from "@recall/embed";

/**
 * The core read path: `recall(query, scope)` → permission-filtered context bundle.
 * Embeds the query, runs hybrid (vector + keyword) retrieval bounded by the
 * holder's ACL, and assembles a context block + sources + relevant decisions.
 */
export async function recall(req: RecallRequest): Promise<RecallResult> {
  const limit = req.limit ?? 8;
  const embedder = getEmbeddingProvider();
  const [queryEmbedding] = await embedder.embed([req.query]);

  const hits = await hybridSearch({
    workspaceSlug: req.scope.workspace,
    queryText: req.query,
    queryEmbedding: queryEmbedding ?? null,
    holder: req.holder,
    sources: req.scope.sources,
    limit,
  });

  const sources: RecallSource[] = hits.map((h) => ({
    nodeId: h.nodeId,
    title: h.title,
    sourceType: h.sourceType,
    url: (h.metadata.url as string | undefined) ?? null,
    score: Number(h.score.toFixed(4)),
    snippet: h.snippet,
  }));

  const context = hits.map((h) => `## ${h.title}\n${h.snippet}`).join("\n\n");

  const rows = await relevantDistillations(req.scope.workspace, req.query, req.holder, limit);
  const decisions = rows as RecallResult["decisions"];

  return { query: req.query, context, sources, decisions };
}
