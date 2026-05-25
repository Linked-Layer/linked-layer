-- Recall initial schema: permission-aware context graph + pgvector.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspaces (
  id          text PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nodes (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  external_id text,
  source_type text,
  title       text NOT NULL,
  body        text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type, external_id)
);
CREATE INDEX IF NOT EXISTS nodes_ws_kind_idx ON nodes (workspace_id, kind);
-- keyword search support
CREATE INDEX IF NOT EXISTS nodes_fts_idx
  ON nodes USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')));

CREATE TABLE IF NOT EXISTS edges (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  src_id      text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  dst_id      text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (workspace_id, kind, src_id, dst_id)
);
CREATE INDEX IF NOT EXISTS edges_src_idx ON edges (src_id);
CREATE INDEX IF NOT EXISTS edges_dst_idx ON edges (dst_id);

CREATE TABLE IF NOT EXISTS raw_ingest (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  external_id text NOT NULL,
  kind        text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience    jsonb NOT NULL DEFAULT '[]'::jsonb,
  links       jsonb NOT NULL DEFAULT '[]'::jsonb,
  processed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type, external_id)
);
CREATE INDEX IF NOT EXISTS raw_ingest_unprocessed_idx ON raw_ingest (workspace_id) WHERE processed = false;

CREATE TABLE IF NOT EXISTS acl (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  node_id     text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  scope       text NOT NULL DEFAULT 'read',
  UNIQUE (workspace_id, subject, node_id, scope)
);
CREATE INDEX IF NOT EXISTS acl_subject_idx ON acl (workspace_id, subject);
CREATE INDEX IF NOT EXISTS acl_node_idx ON acl (node_id);

CREATE TABLE IF NOT EXISTS distillations (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_id     text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  summary     text NOT NULL,
  rationale   text,
  status      text NOT NULL DEFAULT 'decided',
  sources     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS distillations_ws_idx ON distillations (workspace_id, kind);

CREATE TABLE IF NOT EXISTS chunks (
  id          text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_id     text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(1024),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chunks_ws_idx ON chunks (workspace_id);
-- HNSW cosine index (no training step required, unlike ivfflat)
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
