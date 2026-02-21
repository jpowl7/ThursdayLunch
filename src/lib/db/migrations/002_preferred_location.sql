ALTER TABLE responses ADD COLUMN preferred_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
