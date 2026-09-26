CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  invite_token_hash text NOT NULL UNIQUE,
  invite_generation integer NOT NULL DEFAULT 1 CHECK (invite_generation > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_sessions (
  token_hash text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor')),
  generation integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_sessions_workspace_idx ON workspace_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_sessions_expiry_idx ON workspace_sessions(expires_at);

CREATE TABLE IF NOT EXISTS areas (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS areas_workspace_idx ON areas(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS processes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  area_id text NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  o smallint NOT NULL DEFAULT 0 CHECK (o IN (0, 5)),
  p smallint NOT NULL DEFAULT 0 CHECK (p IN (0, 5)),
  e smallint NOT NULL DEFAULT 0 CHECK (e IN (0, 5)),
  a smallint NOT NULL DEFAULT 0 CHECK (a IN (0, 5)),
  level_mbc text NOT NULL DEFAULT 'NONE' CHECK (level_mbc IN ('NONE', 'M', 'B', 'C')),
  level_k text NOT NULL DEFAULT 'NE' CHECK (level_k IN ('NE', 'E', 'D', 'I', 'U', 'MC')),
  psmis jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS processes_workspace_idx ON processes(workspace_id, sort_order);
CREATE INDEX IF NOT EXISTS processes_area_idx ON processes(area_id, sort_order);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
