-- Indexes to reduce full table scans and Neon compute usage

-- events: queried by (group_id, status) in getCurrentEvent, getScheduledEvent, leaderboard, etc.
CREATE INDEX IF NOT EXISTS idx_events_group_status ON events(group_id, status);

-- events: queried by (group_id, date) in eventExistsForDate
CREATE INDEX IF NOT EXISTS idx_events_group_date ON events(group_id, date);

-- locations: queried by event_id in getEventSnapshot, getPastLocations
CREATE INDEX IF NOT EXISTS idx_locations_event_id ON locations(event_id);

-- responses: queried by event_id in getEventSnapshot, leaderboard queries
CREATE INDEX IF NOT EXISTS idx_responses_event_id ON responses(event_id);

-- responses: queried by (event_id, status) in leaderboard queries
CREATE INDEX IF NOT EXISTS idx_responses_event_status ON responses(event_id, status);

-- responses: queried by (event_id, participant_key) in getResponseByKey, hasConflictingResponse
-- Already has UNIQUE(event_id, participant_key) from 001_initial.sql which creates an index

-- location_votes: queried by response_id in getEventSnapshot subquery
CREATE INDEX IF NOT EXISTS idx_location_votes_response_id ON location_votes(response_id);

-- location_votes: queried by location_id in trendsetter leaderboard
CREATE INDEX IF NOT EXISTS idx_location_votes_location_id ON location_votes(location_id);

-- response_history: queried by event_id in flip flopper leaderboard and getResponseHistory
CREATE INDEX IF NOT EXISTS idx_response_history_event_id ON response_history(event_id);

-- participants: queried by participant_key in getParticipantByKey
CREATE INDEX IF NOT EXISTS idx_participants_key ON participants(participant_key);

-- recurring_schedules: queried by group_id
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_group_id ON recurring_schedules(group_id);
