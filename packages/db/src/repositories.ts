import { newId } from "@recall/core";
import type { DistillStatus, RawItem, SourceType } from "@recall/core";
import { and, eq, inArray, sql as dsql } from "drizzle-orm";
import { db } from "./client";
import { sql } from "./client";
import { acl, apiKeys, chunks, connectors, distillations, edges, nodes, rawIngest, workspaces } from "./schema";
import type { ApiKeyRow, ConnectorRow, DistillationRow, NodeRow, RawIngestRow } from "./schema";

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

export async function getWorkspaceSlugById(id: string): Promise<string | null> {
  const row = await db.select({ slug: workspaces.slug }).from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return row[0]?.slug ?? null;
}

// ---- api keys ----

export interface InsertApiKeyInput {
  workspaceId: string;
  name: string;
  keyHash: string;
  prefix: string;
  holder: string;
  scopes: string[];
}

export async function insertApiKey(input: InsertApiKeyInput): Promise<ApiKeyRow> {
  const rows = await db
    .insert(apiKeys)
    .values({ id: newId("key"), ...input })
    .returning();
  return rows[0]!;
}

export async function findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRow | null> {
  const row = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)))
    .limit(1);
  return row[0] ?? null;
}

export async function listApiKeys(workspaceId: string): Promise<ApiKeyRow[]> {
  return db.select().from(apiKeys).where(eq(apiKeys.workspaceId, workspaceId));
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const rows = await db.update(apiKeys).set({ revoked: true }).where(eq(apiKeys.id, id)).returning({ id: apiKeys.id });
  return rows.length > 0;
}

export async function touchApiKey(id: string): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function countActiveApiKeys(workspaceId: string): Promise<number> {
  const r = await sql`SELECT count(*)::int AS n FROM api_keys WHERE workspace_id = ${workspaceId} AND revoked = false`;
  return r[0]!.n as number;
}

// ---- connectors ----

export async function upsertConnectorConfig(
  workspaceId: string,
  sourceType: SourceType,
  config: Record<string, unknown>,
): Promise<ConnectorRow> {
  const rows = await db
    .insert(connectors)
    .values({ id: newId("con"), workspaceId, sourceType, config })
    .onConflictDoUpdate({ target: [connectors.workspaceId, connectors.sourceType], set: { config } })
    .returning();
  return rows[0]!;
}

export async function getConnectorRow(
  workspaceId: string,
  sourceType: SourceType,
): Promise<ConnectorRow | null> {
  const row = await db
    .select()
    .from(connectors)
    .where(and(eq(connectors.workspaceId, workspaceId), eq(connectors.sourceType, sourceType)))
    .limit(1);
  return row[0] ?? null;
}

export async function listConnectorRows(workspaceId: string): Promise<ConnectorRow[]> {
  return db.select().from(connectors).where(eq(connectors.workspaceId, workspaceId));
}

export async function updateConnectorCursor(
  id: string,
  cursor: Record<string, unknown>,
  lastSyncAt: Date,
): Promise<void> {
  await db.update(connectors).set({ cursor, lastSyncAt }).where(eq(connectors.id, id));
}

/** All enabled connectors across workspaces, with their workspace slug (for the scheduler). */
export async function listEnabledConnectorsWithSlug(): Promise<
  { id: string; workspaceSlug: string; sourceType: SourceType }[]
> {
  const rows = await sql<Array<{ id: string; slug: string; source_type: string }>>`
    SELECT c.id, w.slug, c.source_type
    FROM connectors c JOIN workspaces w ON w.id = c.workspace_id
    WHERE c.enabled = true
  `;
  return rows.map((r) => ({ id: r.id, workspaceSlug: r.slug, sourceType: r.source_type as SourceType }));
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
      // Refresh the stored content on re-sync (title/body/metadata/audience/links/kind)
      // and re-queue it for the pipeline. Without this, re-seeding would re-process the
      // ORIGINAL raw row and silently ignore updated content or ACL audience.
      target: [rawIngest.workspaceId, rawIngest.sourceType, rawIngest.externalId],
      set: {
        kind: dsql`excluded.kind`,
        title: dsql`excluded.title`,
        body: dsql`excluded.body`,
        metadata: dsql`excluded.metadata`,
        audience: dsql`excluded.audience`,
        links: dsql`excluded.links`,
        processed: false,
      },
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
  metadata?: Record<string, unknown>;
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
    metadata: input.metadata ?? {},
  });
  return id;
}

/** Existing distillation summaries in a workspace (for cross-graph dedup). */
export async function listDistillationSummaries(workspaceId: string): Promise<{ nodeId: string; summary: string }[]> {
  const rows = await sql<Array<{ nodeId: string; summary: string }>>`
    SELECT node_id AS "nodeId", summary FROM distillations WHERE workspace_id = ${workspaceId}
  `;
  return rows;
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

// ---- graph browsing (permission-filtered, paginated) ----

export interface NodeSummary {
  id: string;
  kind: string;
  title: string;
  sourceType: string | null;
  url: string | null;
  updatedAt: string;
}

const SUBJ = (holder: string | undefined) => holder ?? "__anonymous__";

export async function listNodes(
  workspaceSlug: string,
  opts: { holder?: string; kind?: string; limit: number; offset: number },
): Promise<NodeSummary[]> {
  const subject = SUBJ(opts.holder);
  const rows = await sql<Array<Record<string, unknown>>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT n.id, n.kind, n.title, n.source_type, n.metadata->>'url' AS url, n.updated_at
    FROM nodes n
    WHERE n.workspace_id = (SELECT id FROM ws)
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
      ${opts.kind ? sql`AND n.kind = ${opts.kind}` : sql``}
    ORDER BY n.updated_at DESC
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `;
  return rows.map(mapNodeSummary);
}

export async function listTimeline(
  workspaceSlug: string,
  opts: { holder?: string; limit: number; offset: number },
): Promise<NodeSummary[]> {
  return listNodes(workspaceSlug, { ...opts });
}

export interface NodeDetail {
  node: NodeSummary & { body: string | null; metadata: Record<string, unknown> };
  neighbors: { edgeKind: string; direction: "out" | "in"; nodeId: string; title: string }[];
  distillations: Pick<DistillationRow, "summary" | "rationale" | "status" | "kind">[];
}

export async function getNodeDetail(
  workspaceSlug: string,
  nodeId: string,
  holder: string | undefined,
): Promise<NodeDetail | null> {
  const subject = SUBJ(holder);
  const nodeRows = await sql<Array<Record<string, unknown>>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT n.id, n.kind, n.title, n.body, n.source_type, n.metadata, n.metadata->>'url' AS url, n.updated_at
    FROM nodes n
    WHERE n.id = ${nodeId} AND n.workspace_id = (SELECT id FROM ws)
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
    LIMIT 1
  `;
  const n = nodeRows[0];
  if (!n) return null;

  // Neighbors (only those the caller may also see)
  const neighbors = await sql<Array<Record<string, unknown>>>`
    SELECT e.kind AS edge_kind, 'out' AS direction, m.id AS node_id, m.title
    FROM edges e JOIN nodes m ON m.id = e.dst_id
    WHERE e.src_id = ${nodeId}
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = m.id AND a.subject IN (${subject}, '*'))
    UNION ALL
    SELECT e.kind AS edge_kind, 'in' AS direction, m.id AS node_id, m.title
    FROM edges e JOIN nodes m ON m.id = e.src_id
    WHERE e.dst_id = ${nodeId}
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = m.id AND a.subject IN (${subject}, '*'))
  `;

  const distillations = await sql<Array<Pick<DistillationRow, "summary" | "rationale" | "status" | "kind">>>`
    SELECT summary, rationale, status, kind FROM distillations WHERE node_id = ${nodeId}
  `;

  return {
    node: { ...mapNodeSummary(n), body: (n.body as string | null) ?? null, metadata: (n.metadata as Record<string, unknown>) ?? {} },
    neighbors: neighbors.map((r) => ({
      edgeKind: r.edge_kind as string,
      direction: r.direction as "out" | "in",
      nodeId: r.node_id as string,
      title: r.title as string,
    })),
    distillations,
  };
}

export async function listPeople(
  workspaceSlug: string,
  holder: string | undefined,
): Promise<{ person: string; mentions: number }[]> {
  const subject = SUBJ(holder);
  const rows = await sql<Array<{ person: string; mentions: number }>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT n.metadata->>'author' AS person, count(*)::int AS mentions
    FROM nodes n
    WHERE n.workspace_id = (SELECT id FROM ws)
      AND n.metadata->>'author' IS NOT NULL
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
    GROUP BY 1 ORDER BY mentions DESC
  `;
  return rows;
}

export async function listProjects(
  workspaceSlug: string,
  holder: string | undefined,
): Promise<{ project: string; items: number }[]> {
  const subject = SUBJ(holder);
  const rows = await sql<Array<{ project: string; items: number }>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT coalesce(n.metadata->>'repo', n.title) AS project, count(*)::int AS items
    FROM nodes n
    WHERE n.workspace_id = (SELECT id FROM ws)
      AND (n.kind = 'project' OR n.metadata->>'repo' IS NOT NULL)
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
    GROUP BY 1 ORDER BY items DESC
  `;
  return rows;
}

export async function listDecisions(
  workspaceSlug: string,
  holder: string | undefined,
  opts: { kind?: string; status?: string; limit: number; offset: number },
): Promise<Pick<DistillationRow, "summary" | "rationale" | "status" | "kind" | "nodeId">[]> {
  const subject = SUBJ(holder);
  return sql<Array<Pick<DistillationRow, "summary" | "rationale" | "status" | "kind" | "nodeId">>>`
    WITH ws AS (SELECT id FROM workspaces WHERE slug = ${workspaceSlug})
    SELECT d.summary, d.rationale, d.status, d.kind, d.node_id AS "nodeId"
    FROM distillations d JOIN nodes n ON n.id = d.node_id
    WHERE d.workspace_id = (SELECT id FROM ws)
      AND EXISTS (SELECT 1 FROM acl a WHERE a.node_id = n.id AND a.subject IN (${subject}, '*'))
      ${opts.kind ? sql`AND d.kind = ${opts.kind}` : sql``}
      ${opts.status ? sql`AND d.status = ${opts.status}` : sql``}
    ORDER BY d.created_at DESC
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `;
}

function mapNodeSummary(r: Record<string, unknown>): NodeSummary {
  return {
    id: r.id as string,
    kind: r.kind as string,
    title: r.title as string,
    sourceType: (r.source_type as string | null) ?? null,
    url: (r.url as string | null) ?? null,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
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
