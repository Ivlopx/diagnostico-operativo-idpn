CREATE TABLE IF NOT EXISTS psmi_edit_locks (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  psmi_id text NOT NULL,
  holder_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, process_id, psmi_id)
);

CREATE INDEX IF NOT EXISTS psmi_edit_locks_expiry_idx ON psmi_edit_locks(expires_at);
