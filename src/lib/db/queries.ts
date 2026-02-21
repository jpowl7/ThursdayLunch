import { getDb } from "./client";

export async function getCurrentEvent() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM events WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`;
  return rows[0] || null;
}

export async function getEventById(id: string) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM events WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getEventSnapshot(eventId: string) {
  const sql = getDb();

  const [eventRows, locationRows, responseRows] = await Promise.all([
    sql`SELECT * FROM events WHERE id = ${eventId}`,
    sql`SELECT * FROM locations WHERE event_id = ${eventId} ORDER BY created_at`,
    sql`SELECT r.*, COALESCE(
      (SELECT json_agg(lv.location_id) FROM location_votes lv WHERE lv.response_id = r.id),
      '[]'::json
    ) as location_votes
    FROM responses r WHERE r.event_id = ${eventId} ORDER BY r.created_at`,
  ]);

  if (!eventRows[0]) return null;

  const event = mapEvent(eventRows[0]);
  const locations = locationRows.map(mapLocation);
  const responses = responseRows.map(mapResponse);

  return { event, locations, responses };
}

export async function createEvent(
  input: { title: string; date: string; earliestTime: string; latestTime: string },
  locations: { name: string; address?: string; mapsUrl?: string }[]
) {
  const sql = getDb();

  // Close any open events first
  await sql`UPDATE events SET status = 'cancelled' WHERE status = 'open'`;

  const eventRows = await sql`
    INSERT INTO events (title, date, earliest_time, latest_time)
    VALUES (${input.title}, ${input.date}, ${input.earliestTime}, ${input.latestTime})
    RETURNING *
  `;

  const event = eventRows[0];

  for (const loc of locations) {
    await sql`
      INSERT INTO locations (event_id, name, address, maps_url)
      VALUES (${event.id}, ${loc.name}, ${loc.address || null}, ${loc.mapsUrl || null})
    `;
  }

  return getEventSnapshot(event.id);
}

export async function upsertResponse(
  eventId: string,
  participantKey: string,
  input: { name: string; isIn: boolean; availableFrom: string | null; availableTo: string | null; locationVotes: string[] }
) {
  const sql = getDb();

  const rows = await sql`
    INSERT INTO responses (event_id, participant_key, name, is_in, available_from, available_to)
    VALUES (${eventId}, ${participantKey}, ${input.name}, ${input.isIn}, ${input.availableFrom}, ${input.availableTo})
    ON CONFLICT (event_id, participant_key) DO UPDATE SET
      name = ${input.name},
      is_in = ${input.isIn},
      available_from = ${input.availableFrom},
      available_to = ${input.availableTo},
      updated_at = now()
    RETURNING *
  `;

  const response = rows[0];

  // Update location votes
  await sql`DELETE FROM location_votes WHERE response_id = ${response.id}`;
  for (const locationId of input.locationVotes) {
    await sql`
      INSERT INTO location_votes (response_id, location_id)
      VALUES (${response.id}, ${locationId})
    `;
  }

  return response;
}

export async function finalizeEvent(id: string, chosenTime: string, chosenLocationId: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events
    SET status = 'finalized', chosen_time = ${chosenTime}, chosen_location_id = ${chosenLocationId}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

// Strip seconds from TIME columns ("11:00:00" -> "11:00")
function normalizeTime(val: unknown): string {
  const s = String(val);
  const parts = s.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : s;
}

// Row mappers (snake_case DB columns -> camelCase)
function mapEvent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    date: String(row.date),
    earliestTime: normalizeTime(row.earliest_time),
    latestTime: normalizeTime(row.latest_time),
    status: row.status as "open" | "finalized" | "cancelled",
    chosenTime: row.chosen_time ? normalizeTime(row.chosen_time) : null,
    chosenLocationId: row.chosen_location_id ? String(row.chosen_location_id) : null,
    createdAt: String(row.created_at),
  };
}

function mapLocation(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    address: (row.address as string) || null,
    mapsUrl: (row.maps_url as string) || null,
    createdAt: String(row.created_at),
  };
}

function mapResponse(row: Record<string, unknown>) {
  let votes: string[] = [];
  if (row.location_votes) {
    if (Array.isArray(row.location_votes)) {
      votes = row.location_votes.filter((v): v is string => v !== null);
    } else if (typeof row.location_votes === "string") {
      try {
        const parsed = JSON.parse(row.location_votes);
        votes = Array.isArray(parsed) ? parsed.filter((v: unknown): v is string => v !== null) : [];
      } catch {
        votes = [];
      }
    }
  }
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    participantKey: row.participant_key as string,
    name: row.name as string,
    isIn: row.is_in as boolean,
    availableFrom: row.available_from ? normalizeTime(row.available_from) : null,
    availableTo: row.available_to ? normalizeTime(row.available_to) : null,
    locationVotes: votes,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
