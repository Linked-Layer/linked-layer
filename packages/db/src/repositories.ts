import { newId } from "@recall/core";
import type { DistillStatus, RawItem, SourceType } from "@recall/core";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { sql } from "./client";
import { acl, chunks, distillations, edges, nodes, rawIngest, workspaces } from "./schema";
import type { DistillationRow, NodeRow, RawIngestRow } from "./schema";

// ---- workspaces ----

export async function ensureWorkspace(slug: string, name: string): Promise<string> {
  const id = newId("ws");
  await db.insert(workspaces).values({ id, slug, name }).onConflictDoNothing({ target: workspaces.slug });
  const row = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return row[0]!.id;
}

export async function getWorkspaceIdBySlug(slug: string): Promise<string | null> {
  const row = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return row[0]?.id ?? null;
}

// ---- raw ingest ----

export async function insertRawItems(workspaceId: string, items: RawItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const values = items.map((it) => ({
    id: newId("raw"),
    workspaceId,
    sourceType: it.sourceType,
    externalId: it.externalId,
    kind: it.kind,
    title: it.title,
    body: it.body,
    metadata: it.metadata,
    audience: it.audience,
    links: it.links ?? [],
    processed: false,
  }));
  await db
    .insert(rawIngest)
    .values(values)
    .onConflictDoUpdate({
      target: [rawIngest.workspaceId, rawIngest.sourceType, rawIngest.externalId],
      set: { processed: false },
    });
  return values.length;
}

export async function getUnprocessedRaw(workspaceId: string, limit = 200): Promise<RawIngestRow[]> {
  return db
    .select()
    .from(rawIngest)
    .where(and(eq(rawIngest.workspaceId, workspaceId), eq(rawIngest.processed, false)))
    .limit(limit);
}

export async function markRawProcessed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.update(rawIngest).set({ processed: true }).where(inArray(rawIngest.id, ids));
}

// ---- nodes / edges ----

export interface UpsertNodeInput {
  workspaceId: string;
  kind: string;
  externalId?: string | null;
  sourceType?: SourceType | null;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  /** Provide to make the node deterministic (distilled/written nodes). */
  id?: string;
}

export async function upsertNode(input: UpsertNodeInput): Promise<string> {
  const id = input.id ?? newId("nd");
  const values = {
    id,
    workspaceId: input.workspaceId,
    kind: input.kind,
    externalId: input.externalId ?? null,
    sourceType: input.sourceType ?? null,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    updatedAt: new Date(),
  };

  if (input.externalId != null && input.sourceType != null) {
    const rows = await db
      .insert(nodes)
      .values(values)
      .onConflictDoUpdate({
        target: [nodes.workspaceId, nodes.sourceType, nodes.externalId],
        set: { title: values.title, body: values.body, metadata: values.metadata, updatedAt: values.updatedAt },
      })
      .returning({ id: nodes.id });
    return rows[0]!.id;
  }

  const rows = await db
    .insert(nodes)
    .values(values)
    .onConflictDoUpdate({
      target: nodes.id,
      set: { title: values.title, body: values.body, metadata: values.metadata, updatedAt: values.updatedAt },
    })
    .returning({ id: nodes.id });
  return rows[0]!.id;
}

export async function getNodeIdByExternal(
  workspaceId: string,
  sourceType: SourceType,
  externalId: string,
): Promise<string | null> {
  const row = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(
      and(eq(nodes.workspaceId, workspaceId), eq(nodes.sourceType, sourceType), eq(nodes.externalId, externalId)),
    )
    .limit(1);
  return row[0]?.id ?? null;
}

export async function getNode(id: string): Promise<NodeRow | null> {
  const row = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);
  return row[0] ?? null;
}

export async function upsertEdge(
  workspaceId: string,
  kind: string,
  srcId: string,
  dstId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db
    .insert(edges)
    .values({ id: newId("ed"), workspaceId, kind, srcId, dstId, metadata })
    .onConflictDoNothing({ target: [edges.workspaceId, edges.kind, edges.srcId, edges.dstId] });
}

// ---- acl ----

export async function setAcl(workspaceId: string, nodeId: string, subjects: string[]): Promise<void> {
  if (subjects.length === 0) return;
  await db
    .insert(acl)
    .values(subjects.map((subject) => ({ id: newId("acl"), workspaceId, subject, nodeId, scope: "read" })))
    .onConflictDoNothing({ target: [acl.workspaceId, acl.subject, acl.nodeId, acl.scope] });
}

// ---- distillations ----

export interface InsertDistillationInput {
  workspaceId: string;
  nodeId: string;
  kind: "decision" | "action_item";
  summary: string;
  rationale?: string | null;
  status?: DistillStatus;
  sources?: string[];
}

/** Remove a node's distillations so re-processing is idempotent (no duplicates). */
export async function deleteDistillationsForNode(nodeId: string): Promise<void> {
  await db.delete(distillations).where(eq(distillations.nodeId, nodeId));
}

export async function insertDistillation(input: InsertDistillationInput): Promise<string> {
  const id = newId("dst");
  await db.insert(distillations).values({
    id,
    workspaceId: input.workspaceId,
    nodeId: input.nodeId,
    kind: input.kind,
    summary: input.summary,
    rationale: input.rationale ?? null,
    status: input.status ?? "decided",
    sources: input.sources ?? [],
  });
  return id;
}

// ---- chunks ----

export async function deleteChunksForNode(nodeId: string): Promise<void> {
  await db.delete(chunks).where(eq(chunks.nodeId, nodeId));
}

export async function insertChunk(
  workspaceId: string,
  nodeId: string,
  content: string,
  embedding: number[] | null,
): Promise<void> {
  await db.insert(chunks).values({ id: newId("ch"), workspaceId, nodeId, content, embedding });
}

// ---- counts (for verification / seed reporting) ----

export async function counts(workspaceId: string): Promise<Record<string, number>> {
  const [n, e, c, d] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM nodes WHERE workspace_id = ${workspaceId}`,
    sql`SELECT count(*)::int AS n FROM edges WHERE workspace_id = ${workspaceId}`,
    sql`SELECT count(*)::int AS n FROM chunks WHERE workspace_id = ${workspaceId} AND embedding IS NOT NULL`,
    sql`SELECT count(*)::int AS n FROM distillations WHERE workspace_id = ${workspaceId}`,
  ]);
  return { nodes: n[0]!.n, edges: e[0]!.n, embeddedChunks: c[0]!.n, distillations: d[0]!.n };
}

// ---- recall: permission-filtered hybrid search ----

export interface SearchHit {
  nodeId: string;
  title: string;
  sourceType: SourceType | null;
  metadata: Record<string, unknown>;
  snippet: string;
  score: number;
}

export interface HybridSearchParams {
  workspaceSlug: string;
  queryText: string;
  queryEmbedding: number[] | null;
  holder?: string;
  sources?: SourceType[];
  limit: number;
}

/**
 * Hybrid retrieval: vector ANN (cosine) + keyword FTS, merged by node and
 * always filtered through the ACL (holder + public subject `*`).
 */
export async function hybridSearch(params: HybridSearchParams): Promise<SearchHit[]> {
  const { workspaceSlug, queryText, queryEmbedding, holder, sources, limit } = params;
  const subject = holder ?? "__anonymous__";
  const sourceFilter = sources && sources.length > 0 ? sources : null;

  const vectorHits = queryEmbedding
    ? await sql<Array<Record<string, unknown>>>`
        WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
        SELECT n.id AS node_id, n.title, n.source_type, n.metadata, c.content,
               1 - (c.embedding <=> ${"[" + queryEmbedding.join(",") + "]"}::vector) AS score
        FROM chunks c
        JOIN nodes n ON n.id = c.node_id
        WHERE c.workspace_id = (SELECT id FROM ws)
          AND c.embedding IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*')
          )
          ${sourceFilter ? sql`AND n.source_type = ANY(${sourceFilter})` : sql``}
        ORDER BY c.embedding <=> ${"[" + queryEmbedding.join(",") + "]"}::vector
        LIMIT ${limit * 2}
      `
    : [];

  const keywordHits = await sql<Array<Record<string, unknown>>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT n.id AS node_id, n.title, n.source_type, n.metadata,
           left(coalesce(n.body, n.title), 240) AS content,
           ts_rank(to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.body,'')),
                   plainto_tsquery('english', ${queryText})) AS score
    FROM nodes n
    WHERE n.workspace_id = (SELECT id FROM ws)
      AND to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.body,''))
          @@ plainto_tsquery('english', ${queryText})
      AND EXISTS (
        SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*')
      )
      ${sourceFilter ? sql`AND n.source_type = ANY(${sourceFilter})` : sql``}
    ORDER BY score DESC
    LIMIT ${limit * 2}
  `;

  // Merge by node, keeping the strongest signal from either retriever.
  const merged = new Map<string, SearchHit>();
  const add = (rows: Array<Record<string, unknown>>, weight: number) => {
    for (const r of rows) {
      const nodeId = r.node_id as string;
      const score = Number(r.score ?? 0) * weight;
      const existing = merged.get(nodeId);
      if (existing) {
        existing.score = Math.max(existing.score, score);
      } else {
        merged.set(nodeId, {
          nodeId,
          title: r.title as string,
          sourceType: (r.source_type as SourceType | null) ?? null,
          metadata: (r.metadata as Record<string, unknown>) ?? {},
          snippet: String(r.content ?? "").slice(0, 240),
          score,
        });
      }
    }
  };
  add(vectorHits, 1.0);
  add(keywordHits, 0.6);

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Distilled decisions/action items relevant to a query (keyword match). */
export async function relevantDistillations(
  workspaceSlug: string,
  queryText: string,
  holder: string | undefined,
  limit: number,
): Promise<Pick<DistillationRow, "summary" | "rationale" | "status">[]> {
  const subject = holder ?? "__anonymous__";
  // Rank by relevance (ts_rank), but never hard-filter: this is the decision log
  // surfaced alongside recall, so we always return the most relevant decisions
  // the caller is permitted to see, falling back to most-recent for empty queries.
  const rows = await sql<Array<Pick<DistillationRow, "summary" | "rationale" | "status">>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT d.summary, d.rationale, d.status
    FROM distillations d
    JOIN nodes n ON n.id = d.node_id
    WHERE d.workspace_id = (SELECT id FROM ws)
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
    ORDER BY
      ts_rank(
        to_tsvector('english', d.summary || ' ' || coalesce(d.rationale,'')),
        plainto_tsquery('english', ${queryText})
      ) DESC,
      d.created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
