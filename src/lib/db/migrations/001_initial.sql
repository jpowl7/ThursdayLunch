-- Events
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  date            DATE NOT NULL,
  earliest_time   TIME NOT NULL DEFAULT '11:00',
  latest_time     TIME NOT NULL DEFAULT '13:30',
  status          TEXT NOT NULL DEFAULT 'open',
  chosen_time     TIME,
  chosen_location_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Location options (per event)
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  maps_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for chosen_location after locations table exists
ALTER TABLE events
  ADD CONSTRAINT fk_chosen_location
  FOREIGN KEY (chosen_location_id) REFERENCES locations(id);

-- Participant responses
CREATE TABLE IF NOT EXISTS responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_key TEXT NOT NULL,
  name            TEXT NOT NULL,
  is_in           BOOLEAN NOT NULL DEFAULT true,
  available_from  TIME,
  available_to    TIME,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, participant_key)
);

-- Location votes (many-to-many)
CREATE TABLE IF NOT EXISTS location_votes (
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (response_id, location_id)
);
