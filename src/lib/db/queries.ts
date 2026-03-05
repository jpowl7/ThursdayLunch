import { getDb } from "./client";

// ── Group queries ──────────────────────────────────────────

export async function createGroup(slug: string, name: string, passcode: string) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO groups (slug, name, passcode)
    VALUES (${slug}, ${name}, ${passcode})
    RETURNING *
  `;
  return mapGroup(rows[0]);
}

export async function getGroupBySlug(slug: string) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM groups WHERE slug = ${slug}`;
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function verifyGroupPasscode(slug: string, passcode: string) {
  const group = await getGroupBySlug(slug);
  return group && group.passcode === passcode;
}

export async function updateGroupPasscode(groupId: string, newPasscode: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE groups SET passcode = ${newPasscode}
    WHERE id = ${groupId}
    RETURNING *
  `;
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function getGroupByEventId(eventId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT g.* FROM groups g
    JOIN events e ON e.group_id = g.id
    WHERE e.id = ${eventId}
  `;
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function listGroups() {
  const sql = getDb();
  const rows = await sql`
    SELECT g.slug, g.name, COUNT(e.id)::int AS event_count
    FROM groups g
    LEFT JOIN events e ON e.group_id = g.id
    GROUP BY g.id
    ORDER BY (g.passcode = '') DESC, event_count DESC, g.created_at ASC
  `;
  return rows.map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    eventCount: r.event_count as number,
  }));
}

// ── Participant queries ────────────────────────────────────

export async function createParticipant(name: string, pin: string, participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO participants (name, pin, participant_key)
    VALUES (${name}, ${pin}, ${participantKey})
    RETURNING *
  `;
  return mapParticipant(rows[0]);
}

export async function loginParticipant(name: string, pin: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM participants
    WHERE name = ${name} AND pin = ${pin}
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

export async function getParticipantByKey(participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM participants
    WHERE participant_key = ${participantKey}
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

export async function getParticipantByName(name: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM participants
    WHERE LOWER(name) = LOWER(${name})
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

export async function updateParticipantPin(participantKey: string, currentPin: string, newPin: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE participants
    SET pin = ${newPin}
    WHERE participant_key = ${participantKey} AND pin = ${currentPin}
    RETURNING *
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

// ── Event queries ──────────────────────────────────────────

export async function getCurrentEvent(groupId: string) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM events WHERE status IN ('open', 'finalized') AND group_id = ${groupId} ORDER BY created_at DESC LIMIT 1`;
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
  locations: { name: string; address?: string; mapsUrl?: string; websiteUrl?: string }[],
  groupId: string
) {
  const sql = getDb();

  // Close any open events in the same group
  await sql`UPDATE events SET status = 'cancelled' WHERE status = 'open' AND group_id = ${groupId}`;

  const eventRows = await sql`
    INSERT INTO events (title, date, earliest_time, latest_time, group_id)
    VALUES (${input.title}, ${input.date}, ${input.earliestTime}, ${input.latestTime}, ${groupId})
    RETURNING *
  `;

  const event = eventRows[0];

  for (const loc of locations) {
    await sql`
      INSERT INTO locations (event_id, name, address, maps_url, website_url)
      VALUES (${event.id}, ${loc.name}, ${loc.address || null}, ${loc.mapsUrl || null}, ${loc.websiteUrl || null})
    `;
  }

  return getEventSnapshot(event.id);
}

export async function upsertResponse(
  eventId: string,
  participantKey: string,
  input: { name: string; status: "in" | "out" | "maybe"; availableFrom: string | null; availableTo: string | null; locationVotes: string[]; preferredLocationId: string | null }
) {
  const sql = getDb();

  const rows = await sql`
    INSERT INTO responses (event_id, participant_key, name, status, available_from, available_to, preferred_location_id)
    VALUES (${eventId}, ${participantKey}, ${input.name}, ${input.status}, ${input.availableFrom}, ${input.availableTo}, ${input.preferredLocationId})
    ON CONFLICT (event_id, participant_key) DO UPDATE SET
      name = ${input.name},
      status = ${input.status},
      available_from = ${input.availableFrom},
      available_to = ${input.availableTo},
      preferred_location_id = ${input.preferredLocationId},
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

export async function addLocation(
  eventId: string,
  name: string,
  options?: { address?: string; mapsUrl?: string; websiteUrl?: string; addedBy?: string }
) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO locations (event_id, name, address, maps_url, website_url, added_by)
    VALUES (${eventId}, ${name}, ${options?.address ?? null}, ${options?.mapsUrl ?? null}, ${options?.websiteUrl ?? null}, ${options?.addedBy ?? null})
    RETURNING *
  `;
  return mapLocation(rows[0]);
}

export async function deleteLocation(locationId: string, participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM locations
    WHERE id = ${locationId} AND added_by = ${participantKey}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function adminDeleteLocation(locationId: string) {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM locations
    WHERE id = ${locationId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function updateLocationName(locationId: string, name: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE locations SET name = ${name}
    WHERE id = ${locationId}
    RETURNING *
  `;
  return rows[0] ? mapLocation(rows[0]) : null;
}

export async function deleteResponse(responseId: string) {
  const sql = getDb();
  await sql`DELETE FROM location_votes WHERE response_id = ${responseId}`;
  const rows = await sql`
    DELETE FROM responses
    WHERE id = ${responseId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function toggleResponseStatus(responseId: string, status: "in" | "out" | "maybe") {
  const sql = getDb();
  if (status !== "in") {
    // Clear votes and preference when toggling to out or maybe
    await sql`DELETE FROM location_votes WHERE response_id = ${responseId}`;
    const rows = await sql`
      UPDATE responses
      SET status = ${status}, preferred_location_id = NULL, available_from = NULL, available_to = NULL, updated_at = now()
      WHERE id = ${responseId}
      RETURNING *
    `;
    return rows[0] || null;
  }
  const rows = await sql`
    UPDATE responses SET status = 'in', updated_at = now()
    WHERE id = ${responseId}
    RETURNING *
  `;
  return rows[0] || null;
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

// Normalize DATE columns to "YYYY-MM-DD" format
function normalizeDate(val: unknown): string {
  if (!val) return "";
  const d = val instanceof Date ? val : new Date(String(val));
  if (isNaN(d.getTime())) return String(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function reopenEvent(id: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events
    SET status = 'open', chosen_time = NULL, chosen_location_id = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

// ── Leaderboard queries ──────────────────────────────────────

export async function getPastLunches(groupId: string, limit = 10) {
  const sql = getDb();
  const events = await sql`
    SELECT e.*, l.name AS location_name, l.address AS location_address, l.maps_url AS location_maps_url
    FROM events e
    LEFT JOIN locations l ON l.id = e.chosen_location_id
    WHERE e.status = 'finalized' AND e.group_id = ${groupId}
    ORDER BY e.date DESC
    LIMIT ${limit}
  `;

  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id as string);
  const attendees = await sql`
    SELECT r.event_id, r.name
    FROM responses r
    WHERE r.event_id = ANY(${eventIds}) AND r.status = 'in'
    ORDER BY r.created_at
  `;

  const attendeesByEvent = new Map<string, string[]>();
  for (const a of attendees) {
    const eid = a.event_id as string;
    if (!attendeesByEvent.has(eid)) attendeesByEvent.set(eid, []);
    attendeesByEvent.get(eid)!.push(a.name as string);
  }

  return events.map((e) => ({
    id: e.id as string,
    date: normalizeDate(e.date),
    chosenTime: e.chosen_time ? normalizeTime(e.chosen_time) : null,
    locationName: (e.location_name as string) || null,
    locationAddress: (e.location_address as string) || null,
    locationMapsUrl: (e.location_maps_url as string) || null,
    attendees: attendeesByEvent.get(e.id as string) || [],
  }));
}

export async function getFinalizedEventCount(groupId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM events WHERE status = 'finalized' AND group_id = ${groupId}`;
  return rows[0].count;
}

export async function getLeaderboardAttendance(groupId: string) {
  const sql = getDb();
  return sql`
    SELECT r.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM responses r
    JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = r.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    WHERE r.status = 'in'
    GROUP BY r.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

export async function getLeaderboardTastemaker(groupId: string) {
  const sql = getDb();
  return sql`
    SELECT r.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM responses r
    JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = r.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    WHERE r.status = 'in'
      AND r.preferred_location_id IS NOT NULL
      AND r.preferred_location_id = e.chosen_location_id
    GROUP BY r.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

export async function getLeaderboardFirstResponder(groupId: string) {
  const sql = getDb();
  return sql`
    WITH first_responders AS (
      SELECT DISTINCT ON (r.event_id)
             r.participant_key
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in'
      ORDER BY r.event_id, r.created_at
    )
    SELECT fr.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM first_responders fr
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = fr.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    GROUP BY fr.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

export async function getLeaderboardStreaks(groupId: string) {
  const sql = getDb();
  const events = await sql`
    SELECT e.id
    FROM events e
    WHERE e.status = 'finalized' AND e.group_id = ${groupId}
    ORDER BY e.date DESC
  `;
  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id as string);
  const attendees = await sql`
    SELECT r.event_id, r.participant_key
    FROM responses r
    WHERE r.event_id = ANY(${eventIds}) AND r.status = 'in'
  `;

  const eventAttendees = new Map<string, Set<string>>();
  for (const row of attendees) {
    const eventId = row.event_id as string;
    const pk = row.participant_key as string;
    if (!eventAttendees.has(eventId)) eventAttendees.set(eventId, new Set());
    eventAttendees.get(eventId)!.add(pk);
  }

  const allParticipants = new Set<string>();
  for (const row of attendees) allParticipants.add(row.participant_key as string);

  const streaks = new Map<string, number>();
  for (const pk of allParticipants) {
    let streak = 0;
    for (const event of events) {
      const set = eventAttendees.get(event.id as string);
      if (set?.has(pk)) {
        streak++;
      } else {
        break;
      }
    }
    if (streak > 0) streaks.set(pk, streak);
  }

  if (streaks.size === 0) return [];

  const sorted = [...streaks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const keys = sorted.map((s) => s[0]);
  const names = await sql`
    SELECT DISTINCT ON (participant_key) participant_key, name
    FROM responses
    WHERE participant_key = ANY(${keys})
    ORDER BY participant_key, created_at DESC
  `;
  const nameMap = new Map(names.map((n) => [n.participant_key as string, n.name as string]));

  return sorted.map(([pk, count]) => ({
    participant_key: pk,
    name: nameMap.get(pk) || "Unknown",
    count,
  }));
}

export async function getLeaderboardSpeedDemon(groupId: string) {
  const sql = getDb();
  return sql`
    SELECT r.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM responses r
    JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = r.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    WHERE r.status = 'in'
      AND r.created_at <= e.created_at + INTERVAL '5 minutes'
    GROUP BY r.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

export async function getLeaderboardFashionablyLate(groupId: string) {
  const sql = getDb();
  return sql`
    WITH last_responders AS (
      SELECT DISTINCT ON (r.event_id)
             r.participant_key
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in'
      ORDER BY r.event_id, r.created_at DESC
    )
    SELECT lr.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM last_responders lr
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = lr.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    GROUP BY lr.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

export async function getLeaderboardTrendsetter(groupId: string) {
  const sql = getDb();
  return sql`
    WITH first_voters AS (
      SELECT DISTINCT ON (e.id)
             r.participant_key
      FROM events e
      JOIN responses r ON r.event_id = e.id
      JOIN location_votes lv ON lv.response_id = r.id AND lv.location_id = e.chosen_location_id
      WHERE e.status = 'finalized'
        AND e.chosen_location_id IS NOT NULL
        AND e.group_id = ${groupId}
      ORDER BY e.id, lv.created_at ASC
    )
    SELECT fv.participant_key,
           latest_name.name,
           COUNT(*)::int AS count
    FROM first_voters fv
    JOIN LATERAL (
      SELECT r2.name FROM responses r2
      WHERE r2.participant_key = fv.participant_key
      ORDER BY r2.created_at DESC LIMIT 1
    ) latest_name ON true
    GROUP BY fv.participant_key, latest_name.name
    ORDER BY count DESC, latest_name.name
    LIMIT 10
  `;
}

// ── Past locations query ──────────────────────────────────────

export async function getPastLocations(groupId: string, excludeEventId: string) {
  const sql = getDb();
  const rows = await sql`
    WITH ranked AS (
      SELECT
        l.name,
        l.address,
        l.maps_url,
        l.website_url,
        COUNT(*)::int AS use_count,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(l.name)
          ORDER BY l.created_at DESC
        ) AS rn
      FROM locations l
      JOIN events e ON e.id = l.event_id
      WHERE e.group_id = ${groupId}
        AND l.event_id != ${excludeEventId}
      GROUP BY LOWER(l.name), l.name, l.address, l.maps_url, l.website_url, l.created_at
    )
    SELECT name, address, maps_url, website_url, use_count
    FROM ranked
    WHERE rn = 1
    ORDER BY use_count DESC, name
    LIMIT 20
  `;
  return rows.map((r) => ({
    name: r.name as string,
    address: (r.address as string) || null,
    mapsUrl: (r.maps_url as string) || null,
    websiteUrl: (r.website_url as string) || null,
    useCount: r.use_count as number,
  }));
}

// ── Push subscription queries ─────────────────────────────────

export async function upsertPushSubscription(
  participantKey: string,
  groupId: string,
  endpoint: string,
  p256dh: string,
  auth: string
) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO push_subscriptions (participant_key, group_id, endpoint, p256dh, auth)
    VALUES (${participantKey}, ${groupId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (participant_key, group_id, endpoint) DO UPDATE SET
      p256dh = ${p256dh},
      auth = ${auth}
    RETURNING *
  `;
  return rows[0];
}

export async function deletePushSubscription(
  participantKey: string,
  groupId: string,
  endpoint: string
) {
  const sql = getDb();
  await sql`
    DELETE FROM push_subscriptions
    WHERE participant_key = ${participantKey}
      AND group_id = ${groupId}
      AND endpoint = ${endpoint}
  `;
}

export async function isPushSubscribed(participantKey: string, groupId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM push_subscriptions
    WHERE participant_key = ${participantKey} AND group_id = ${groupId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getPushSubscriptionsForGroup(groupId: string, excludeParticipantKey?: string) {
  const sql = getDb();
  const rows = excludeParticipantKey
    ? await sql`
        SELECT * FROM push_subscriptions
        WHERE group_id = ${groupId} AND participant_key != ${excludeParticipantKey}
      `
    : await sql`
        SELECT * FROM push_subscriptions
        WHERE group_id = ${groupId}
      `;
  return rows.map((r) => ({
    participantKey: r.participant_key as string,
    groupId: r.group_id as string,
    endpoint: r.endpoint as string,
    p256dh: r.p256dh as string,
    auth: r.auth as string,
  }));
}

// ── Row mappers ──────────────────────────────────────────────

function mapEvent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    date: normalizeDate(row.date),
    earliestTime: normalizeTime(row.earliest_time),
    latestTime: normalizeTime(row.latest_time),
    status: row.status as "open" | "finalized" | "cancelled",
    chosenTime: row.chosen_time ? normalizeTime(row.chosen_time) : null,
    chosenLocationId: row.chosen_location_id ? String(row.chosen_location_id) : null,
    groupId: row.group_id as string,
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
    websiteUrl: (row.website_url as string) || null,
    addedBy: (row.added_by as string) || null,
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
    status: (row.status as "in" | "out" | "maybe") || "out",
    availableFrom: row.available_from ? normalizeTime(row.available_from) : null,
    availableTo: row.available_to ? normalizeTime(row.available_to) : null,
    locationVotes: votes,
    preferredLocationId: row.preferred_location_id ? String(row.preferred_location_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGroup(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    passcode: row.passcode as string,
    createdAt: String(row.created_at),
  };
}

function mapParticipant(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    pin: row.pin as string,
    participantKey: row.participant_key as string,
    createdAt: String(row.created_at),
  };
}
