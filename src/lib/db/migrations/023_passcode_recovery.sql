-- Recovery email for group admins (NULL = none on file). Stored lowercased.
ALTER TABLE groups ADD COLUMN admin_email TEXT;

-- One-time passcode reset links. Only the sha256 of the token is stored.
CREATE TABLE passcode_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  requested_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX passcode_resets_group_idx ON passcode_resets(group_id, created_at);
