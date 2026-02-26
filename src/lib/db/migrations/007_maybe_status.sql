ALTER TABLE responses ADD COLUMN status TEXT NOT NULL DEFAULT 'in';
UPDATE responses SET status = CASE WHEN is_in THEN 'in' ELSE 'out' END;
ALTER TABLE responses DROP COLUMN is_in;
