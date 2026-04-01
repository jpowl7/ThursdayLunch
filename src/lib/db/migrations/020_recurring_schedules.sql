CREATE TABLE recurring_schedules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             UUID NOT NULL REFERENCES groups(id) UNIQUE,
  day_of_week          SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  title_template       TEXT NOT NULL DEFAULT 'Thursday Lunch',
  earliest_time        TIME NOT NULL DEFAULT '11:30',
  latest_time          TIME NOT NULL DEFAULT '13:30',
  create_days_before   SMALLINT NOT NULL DEFAULT 2,
  delay_window         TEXT NOT NULL DEFAULT 'none',
  delay_start_time     TIME,
  voting_deadline_time TIME,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  last_created_date    DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
