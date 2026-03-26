-- Add voting deadline for auto-finalization
ALTER TABLE events ADD COLUMN voting_deadline TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN auto_finalize_claimed BOOLEAN NOT NULL DEFAULT FALSE;
