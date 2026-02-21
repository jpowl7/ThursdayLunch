# Database Schema

## events
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| title | TEXT | e.g., "Thursday Lunch — Feb 27" |
| date | DATE | Event date |
| earliest_time | TIME | Default 11:00 |
| latest_time | TIME | Default 13:30 |
| status | TEXT | open, finalized, cancelled |
| chosen_time | TIME | Set on finalize |
| chosen_location_id | UUID | FK to locations |
| created_at | TIMESTAMPTZ | Auto |

## locations
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| event_id | UUID | FK to events |
| name | TEXT | Restaurant name |
| address | TEXT | Optional |
| maps_url | TEXT | Optional Google Maps link |
| created_at | TIMESTAMPTZ | Auto |

## responses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| event_id | UUID | FK to events |
| participant_key | TEXT | localStorage UUID |
| name | TEXT | Display name |
| is_in | BOOLEAN | Default true |
| available_from | TIME | Optional |
| available_to | TIME | Optional |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |
| UNIQUE(event_id, participant_key) | | |

## location_votes
| Column | Type | Notes |
|--------|------|-------|
| response_id | UUID | FK to responses |
| location_id | UUID | FK to locations |
| PRIMARY KEY (response_id, location_id) | | |
