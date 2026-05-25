-- Extra distillation metadata (assignee, etc.).
ALTER TABLE distillations ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
