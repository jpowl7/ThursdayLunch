-- Add veto columns to responses (one veto per response, like preferred_location_id)
ALTER TABLE responses ADD COLUMN veto_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE responses ADD COLUMN veto_reason TEXT;

-- Add veto columns to response_history
ALTER TABLE response_history ADD COLUMN veto_location_id UUID;
ALTER TABLE response_history ADD COLUMN veto_reason TEXT;
