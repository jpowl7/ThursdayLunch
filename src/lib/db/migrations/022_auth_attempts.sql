-- Failed passcode / PIN attempts, used for lockouts (10 failures per 15 minutes).
-- key examples: admin:<group_id>, admin-ip:<ip>, pin:<participant_key>, login-ip:<ip>
CREATE TABLE IF NOT EXISTS auth_attempts (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
