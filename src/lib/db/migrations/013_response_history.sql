CREATE TABLE IF NOT EXISTS response_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  participant_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  available_from TIME,
  available_to TIME,
  preferred_location_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
