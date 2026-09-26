ALTER TABLE processes ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE processes DROP CONSTRAINT IF EXISTS processes_revision_positive;
ALTER TABLE processes ADD CONSTRAINT processes_revision_positive CHECK (revision > 0);
