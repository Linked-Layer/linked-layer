import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nodes = pgTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    kind: text("kind").notNull(),
    externalId: text("external_id"),
    sourceType: text("source_type"),
    title: text("title").notNull(),
    body: text("body"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("nodes_ws_kind_idx").on(t.workspaceId, t.kind)],
);

export const edges = pgTable(
  "edges",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    kind: text("kind").notNull(),
    srcId: text("src_id").notNull(),
    dstId: text("dst_id").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [index("edges_src_idx").on(t.srcId), index("edges_dst_idx").on(t.dstId)],
);

export const rawIngest = pgTable("raw_ingest", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  sourceType: text("source_type").notNull(),
  externalId: text("external_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  audience: jsonb("audience").notNull().default(sql`'[]'::jsonb`),
  links: jsonb("links").notNull().default(sql`'[]'::jsonb`),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const acl = pgTable(
  "acl",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    subject: text("subject").notNull(),
    nodeId: text("node_id").notNull(),
    scope: text("scope").notNull().default("read"),
  },
  (t) => [index("acl_subject_idx").on(t.workspaceId, t.subject), index("acl_node_idx").on(t.nodeId)],
);

export const distillations = pgTable("distillations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  nodeId: text("node_id").notNull(),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  rationale: text("rationale"),
  status: text("status").notNull().default("decided"),
  sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  nodeId: text("node_id").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    prefix: text("prefix").notNull(),
    holder: text("holder").notNull(),
    scopes: jsonb("scopes").notNull().default(sql`'["recall","search","ask","write"]'::jsonb`),
    revoked: boolean("revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("api_keys_ws_idx").on(t.workspaceId)],
);

export const connectors = pgTable(
  "connectors",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    sourceType: text("source_type").notNull(),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    cursor: jsonb("cursor").notNull().default(sql`'{}'::jsonb`),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("connectors_ws_idx").on(t.workspaceId)],
);

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type ConnectorRow = typeof connectors.$inferSelect;
export type NodeRow = typeof nodes.$inferSelect;
export type EdgeRow = typeof edges.$inferSelect;
export type RawIngestRow = typeof rawIngest.$inferSelect;
export type AclRow = typeof acl.$inferSelect;
export type DistillationRow = typeof distillations.$inferSelect;
export type ChunkRow = typeof chunks.$inferSelect;
