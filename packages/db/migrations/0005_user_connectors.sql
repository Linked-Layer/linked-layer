-- Per-user connectors: a user connects their own source (e.g. GitHub) with their
-- own token. The token is stored ENCRYPTED (AES-256-GCM); ingested items are scoped
-- to the user's wallet via ACL (audience = [wallet]), so only they can retrieve them.
CREATE TABLE IF NOT EXISTS user_connectors (
  id             text PRIMARY KEY,
  holder         text NOT NULL,                 -- verified wallet address (ACL subject)
  source_type    text NOT NULL,                 -- 'github' (others later)
  workspace_slug text NOT NULL,                 -- workspace the items land in (shared graph, ACL-isolated)
  repos          jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_enc      text NOT NULL,                 -- AES-256-GCM ciphertext of the PAT
  cursor         jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled        boolean NOT NULL DEFAULT true,
  last_sync_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (holder, source_type)
);

CREATE INDEX IF NOT EXISTS user_connectors_holder_idx ON user_connectors (holder);
CREATE INDEX IF NOT EXISTS user_connectors_enabled_idx ON user_connectors (enabled);
