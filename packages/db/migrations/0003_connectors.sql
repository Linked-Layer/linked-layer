-- Persisted connector configuration + incremental-sync cursor (one per source per workspace).

CREATE TABLE IF NOT EXISTS connectors (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type  text NOT NULL,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  cursor       jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled      boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type)
);
CREATE INDEX IF NOT EXISTS connectors_enabled_idx ON connectors (enabled) WHERE enabled = true;
