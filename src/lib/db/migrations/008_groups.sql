-- Multi-group support: groups table, participants table, events.group_id

-- Groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants table (name + PIN identity system)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  participant_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, pin)
);

-- Add group_id to events
ALTER TABLE events ADD COLUMN group_id UUID REFERENCES groups(id);

-- Create a default group for existing events
INSERT INTO groups (slug, name, passcode) VALUES ('thursday-lunch', 'Thursday Lunch', '1234');

-- Assign all existing non-dev events to default group
UPDATE events SET group_id = (SELECT id FROM groups WHERE slug = 'thursday-lunch')
  WHERE is_dev = false;

-- Delete dev sandbox events and their related data
DELETE FROM location_votes WHERE response_id IN (
  SELECT r.id FROM responses r
  JOIN events e ON e.id = r.event_id
  WHERE e.is_dev = true
);
DELETE FROM responses WHERE event_id IN (SELECT id FROM events WHERE is_dev = true);
DELETE FROM locations WHERE event_id IN (SELECT id FROM events WHERE is_dev = true);
DELETE FROM events WHERE is_dev = true;

-- Make group_id NOT NULL now that all remaining events have one
ALTER TABLE events ALTER COLUMN group_id SET NOT NULL;

-- Drop is_dev column
ALTER TABLE events DROP COLUMN is_dev;
