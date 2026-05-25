-- API keys for workspace-scoped Bearer auth (multi-tenant).

CREATE TABLE IF NOT EXISTS api_keys (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  -- sha256 hex of the full key; the plaintext is shown only once at creation
  key_hash     text NOT NULL UNIQUE,
  -- non-secret display prefix, e.g. "rcl_ab12cd34"
  prefix       text NOT NULL,
  -- subject identity bound to this key (its $RECALL holder for gating/ACL)
  holder       text NOT NULL,
  scopes       jsonb NOT NULL DEFAULT '["recall","search","ask","write"]'::jsonb,
  revoked      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_ws_idx ON api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS api_keys_active_idx ON api_keys (key_hash) WHERE revoked = false;
