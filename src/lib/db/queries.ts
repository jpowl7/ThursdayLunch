import { createHash } from "node:crypto";
import { getDb } from "./client";

/**
 * One-way hash of a participant_key, safe to send to every client.
 * Clients hash their own key the same way (SHA-256 hex, first 16 chars)
 * to find "me" in a snapshot without the raw key ever leaving the server.
 */
export function hashParticipantKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

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
  const rows = await sql`SELECT id, slug, name, passcode, location_lat, location_lng, location_name, created_at FROM groups WHERE slug = ${slug}`;
  return rows[0] ? mapGroup(rows[0]) : null;
}

/** `passcodeHash` is the scrypt string from hashCredential(), or "" for an open group. */
export async function updateGroupPasscode(groupId: string, passcodeHash: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE groups SET passcode = ${passcodeHash}
    WHERE id = ${groupId}
    RETURNING *
  `;
  return rows[0] ? mapGroup(rows[0]) : null;
}

// ── Auth lockout (see src/lib/auth.ts) ─────────────────────

const AUTH_MAX_FAILURES = 10;

export async function getAuthLockout(keys: string[]): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM auth_attempts
    WHERE key = ANY(${keys}::text[])
      AND count >= ${AUTH_MAX_FAILURES}
      AND window_start > now() - interval '15 minutes'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function recordAuthFailure(keys: string[]): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO auth_attempts (key, count, window_start)
    SELECT k, 1, now() FROM unnest(${keys}::text[]) AS k
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE auth_attempts.count + 1 END,
      window_start = CASE WHEN auth_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE auth_attempts.window_start END
  `;
}

export async function pruneAuthAttempts(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM auth_attempts WHERE window_start < now() - interval '1 day'`;
}

export async function updateGroupLocation(slug: string, lat: number, lng: number, name: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE groups SET location_lat = ${lat}, location_lng = ${lng}, location_name = ${name}
    WHERE slug = ${slug}
    RETURNING *
  `;
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function getGroupLocation(slug: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT location_lat, location_lng, location_name FROM groups WHERE slug = ${slug}
  `;
  if (!rows[0] || rows[0].location_lat == null) return null;
  return {
    lat: Number(rows[0].location_lat),
    lng: Number(rows[0].location_lng),
    name: (rows[0].location_name as string) || null,
  };
}

export async function getGroupByEventId(eventId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT g.id, g.slug, g.name, g.passcode, g.location_lat, g.location_lng, g.location_name, g.created_at FROM groups g
    JOIN events e ON e.group_id = g.id
    WHERE e.id = ${eventId}
  `;
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function getAllGroupIds() {
  const sql = getDb();
  const rows = await sql`SELECT id, slug FROM groups`;
  return rows.map((r) => ({ id: r.id as string, slug: r.slug as string }));
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

/** `pinHash` is the scrypt string from hashCredential(). */
export async function createParticipant(name: string, pinHash: string, participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO participants (name, pin, participant_key)
    VALUES (${name}, ${pinHash}, ${participantKey})
    RETURNING *
  `;
  return mapParticipant(rows[0]);
}

export async function getParticipantByKey(participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, pin, participant_key, created_at FROM participants
    WHERE participant_key = ${participantKey}
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

export async function getParticipantByName(name: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, pin, participant_key, created_at FROM participants
    WHERE LOWER(name) = LOWER(${name})
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

/**
 * Is this key one the app has actually issued? True if it is a registered
 * participant or has ever RSVP'd to an event in this group. Used to gate
 * open endpoints (add restaurant, push subscribe) against junk callers.
 */
export async function isKnownParticipant(participantKey: string, groupId: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 WHERE EXISTS (SELECT 1 FROM participants WHERE participant_key = ${participantKey})
      OR EXISTS (
        SELECT 1 FROM responses r JOIN events e ON e.id = r.event_id
        WHERE r.participant_key = ${participantKey} AND e.group_id = ${groupId}
      )
  `;
  return rows.length > 0;
}

/** `pinHash` is the scrypt string from hashCredential(). Verification happens in src/lib/auth.ts. */
export async function setParticipantPin(participantKey: string, pinHash: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE participants
    SET pin = ${pinHash}
    WHERE participant_key = ${participantKey}
    RETURNING *
  `;
  return rows[0] ? mapParticipant(rows[0]) : null;
}

// ── Event queries ──────────────────────────────────────────

export async function getCurrentEvent(groupId: string) {
  const sql = getDb();
  const rows = await sql`SELECT id FROM events WHERE status IN ('open', 'finalized') AND group_id = ${groupId} AND (go_live_at IS NULL OR go_live_at <= NOW()) AND (created_at > NOW() - INTERVAL '24 hours' OR date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 1`;
  return rows[0] || null;
}

export async function getScheduledEvent(groupId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id FROM events
    WHERE status = 'open' AND group_id = ${groupId}
      AND go_live_at IS NOT NULL AND go_live_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] || null;
}

export async function claimGoLiveNotifications(groupId: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events SET notifications_sent = TRUE
    WHERE group_id = ${groupId} AND status = 'open'
      AND go_live_at IS NOT NULL AND go_live_at <= NOW()
      AND notifications_sent = FALSE
    RETURNING *
  `;
  return rows[0] || null;
}

export async function claimAutoFinalize(groupId: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events SET auto_finalize_claimed = TRUE
    WHERE group_id = ${groupId} AND status = 'open'
      AND voting_deadline IS NOT NULL AND voting_deadline <= NOW()
      AND auto_finalize_claimed = FALSE
    RETURNING *
  `;
  return rows[0] || null;
}

/**
 * Every upcoming instant at which the cron has work to do: go-live pushes not yet sent and
 * voting deadlines not yet claimed, on open events, across all groups. Recently-passed
 * instants (last hour) are included so a tick that missed one still catches it.
 * Returned as ISO strings so the result can live in Next's data cache.
 */
export async function getPendingCronInstants(): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT go_live_at, voting_deadline, notifications_sent, auto_finalize_claimed
    FROM events
    WHERE status = 'open'
      AND (
        (go_live_at IS NOT NULL AND notifications_sent = FALSE AND go_live_at > NOW() - INTERVAL '1 hour')
        OR (voting_deadline IS NOT NULL AND auto_finalize_claimed = FALSE AND voting_deadline > NOW() - INTERVAL '1 hour')
      )
  `;
  const instants: string[] = [];
  for (const row of rows) {
    if (row.go_live_at && !row.notifications_sent) instants.push(new Date(row.go_live_at as string).toISOString());
    if (row.voting_deadline && !row.auto_finalize_claimed) instants.push(new Date(row.voting_deadline as string).toISOString());
  }
  return instants.sort();
}

export async function updateVotingDeadline(eventId: string, votingDeadline: string | null) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events SET voting_deadline = ${votingDeadline}, auto_finalize_claimed = FALSE
    WHERE id = ${eventId}
    RETURNING *
  `;
  return rows[0] ? mapEvent(rows[0]) : null;
}

export async function getEventById(id: string) {
  const sql = getDb();
  const rows = await sql`SELECT id, status FROM events WHERE id = ${id}`;
  return rows[0] || null;
}

// A whole event snapshot in ONE round-trip: the event row plus its locations and
// responses folded in as JSON arrays. Every sql`` call is a separate HTTPS request to
// Neon, and this is the query every open tab polls, so it matters most here.
// Used through sql.query() so the same text serves both lookups below.
const SNAPSHOT_SELECT = `
  SELECT e.id, e.title, e.date::text AS date, e.earliest_time, e.latest_time, e.status,
         e.chosen_time, e.chosen_location_id, e.group_id, e.created_at, e.go_live_at,
         e.delay_start_at, e.delay_end_at, e.voting_deadline,
         (SELECT COALESCE(json_agg(json_build_object(
             'id', l.id, 'event_id', l.event_id, 'name', l.name, 'address', l.address,
             'maps_url', l.maps_url, 'website_url', l.website_url, 'added_by', l.added_by,
             'created_at', l.created_at
           ) ORDER BY l.created_at), '[]'::json)
          FROM locations l WHERE l.event_id = e.id) AS locations,
         (SELECT COALESCE(json_agg(json_build_object(
             'id', r.id, 'event_id', r.event_id, 'participant_key', r.participant_key,
             'name', r.name, 'status', r.status, 'available_from', r.available_from,
             'available_to', r.available_to, 'preferred_location_id', r.preferred_location_id,
             'veto_location_id', r.veto_location_id, 'veto_reason', r.veto_reason,
             'no_show', r.no_show, 'created_at', r.created_at, 'updated_at', r.updated_at,
             'location_votes', (SELECT COALESCE(json_agg(lv.location_id), '[]'::json)
                                FROM location_votes lv WHERE lv.response_id = r.id)
           ) ORDER BY r.created_at), '[]'::json)
          FROM responses r WHERE r.event_id = e.id) AS responses
  FROM events e`;

function asJsonArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapSnapshotRow(row: Record<string, unknown>) {
  return {
    event: mapEvent(row),
    locations: asJsonArray(row.locations).map(mapLocation),
    responses: asJsonArray(row.responses).map(mapResponse),
  };
}

export async function getEventSnapshot(eventId: string) {
  const sql = getDb();
  const rows = await sql.query(`${SNAPSHOT_SELECT} WHERE e.id = $1`, [eventId]);
  return rows[0] ? mapSnapshotRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * The group's current event (same rule as getCurrentEvent) with its full snapshot,
 * resolved from the slug in a single query. `groupFound` lets the route tell
 * "no such group" apart from "no event right now".
 */
export async function getCurrentEventSnapshot(groupSlug: string) {
  const sql = getDb();
  const rows = await sql.query(
    `SELECT g.id AS found_group_id, snap.*
     FROM groups g
     LEFT JOIN LATERAL (
       ${SNAPSHOT_SELECT}
       WHERE e.group_id = g.id
         AND e.status IN ('open', 'finalized')
         AND (e.go_live_at IS NULL OR e.go_live_at <= NOW())
         AND (e.created_at > NOW() - INTERVAL '24 hours' OR e.date >= CURRENT_DATE)
       ORDER BY e.created_at DESC
       LIMIT 1
     ) snap ON TRUE
     WHERE g.slug = $1`,
    [groupSlug]
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return { groupFound: false, snapshot: null };
  if (!row.id) return { groupFound: true, snapshot: null };
  return { groupFound: true, snapshot: mapSnapshotRow(row) };
}

export async function createEvent(
  input: {
    title: string; date: string; earliestTime: string; latestTime: string;
    goLiveAt?: string | null; delayStartAt?: string | null; delayEndAt?: string | null;
    votingDeadline?: string | null;
  },
  locations: { name: string; address?: string; mapsUrl?: string; websiteUrl?: string }[],
  groupId: string
) {
  const sql = getDb();

  // Close any open events in the same group
  await sql`UPDATE events SET status = 'cancelled' WHERE status = 'open' AND group_id = ${groupId}`;

  const notificationsSent = !input.goLiveAt;
  const eventRows = await sql`
    INSERT INTO events (title, date, earliest_time, latest_time, group_id, go_live_at, notifications_sent, heads_up_sent, delay_start_at, delay_end_at, voting_deadline)
    VALUES (${input.title}, ${input.date}, ${input.earliestTime}, ${input.latestTime}, ${groupId}, ${input.goLiveAt || null}, ${notificationsSent}, TRUE, ${input.delayStartAt || null}, ${input.delayEndAt || null}, ${input.votingDeadline || null})
    RETURNING *
  `;

  const event = eventRows[0];

  if (locations.length > 0) {
    // One multi-row insert instead of one round-trip per location.
    await sql`
      INSERT INTO locations (event_id, name, address, maps_url, website_url)
      SELECT ${event.id}, t.name, t.address, t.maps_url, t.website_url
      FROM unnest(
        ${locations.map((l) => l.name)}::text[],
        ${locations.map((l) => l.address || null)}::text[],
        ${locations.map((l) => l.mapsUrl || null)}::text[],
        ${locations.map((l) => l.websiteUrl || null)}::text[]
      ) AS t(name, address, maps_url, website_url)
    `;
  }

  return getEventSnapshot(event.id);
}

/**
 * Everything the response-save route needs to check before writing, in one query:
 * does the event exist, is it open, and is this name already taken by someone else.
 */
export async function getEventForResponse(eventId: string, participantKey: string, name: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT e.status,
           EXISTS (
             SELECT 1 FROM responses r
             WHERE r.event_id = e.id AND LOWER(r.name) = LOWER(${name}) AND r.participant_key != ${participantKey}
           ) AS name_conflict
    FROM events e WHERE e.id = ${eventId}
  `;
  if (!rows[0]) return null;
  return { status: rows[0].status as string, nameConflict: rows[0].name_conflict === true };
}

export async function hasConflictingResponse(eventId: string, participantKey: string, name: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM responses
    WHERE event_id = ${eventId}
      AND LOWER(name) = LOWER(${name})
      AND participant_key != ${participantKey}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getResponseByKey(eventId: string, participantKey: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, status FROM responses
    WHERE event_id = ${eventId} AND participant_key = ${participantKey}
  `;
  return rows[0] ?? null;
}

export async function upsertResponse(
  eventId: string,
  participantKey: string,
  input: { name: string; status: "in" | "out" | "maybe"; availableFrom: string | null; availableTo: string | null; locationVotes: string[]; preferredLocationId: string | null; vetoLocationId?: string | null; vetoReason?: string | null }
) {
  const sql = getDb();
  const vetoLocationId = input.vetoLocationId ?? null;
  const vetoReason = input.vetoReason ?? null;
  const votes = input.locationVotes;

  // All four statements go to Neon in ONE request (and one transaction), so a save is
  // atomic and costs one round-trip instead of 3 + one per vote. Later statements find
  // the response by (event_id, participant_key) rather than needing its id back first.
  const [rows] = await sql.transaction([
    sql`
      WITH old AS (
        SELECT status FROM responses WHERE event_id = ${eventId} AND participant_key = ${participantKey}
      )
      INSERT INTO responses (event_id, participant_key, name, status, available_from, available_to, preferred_location_id, veto_location_id, veto_reason)
      VALUES (${eventId}, ${participantKey}, ${input.name}, ${input.status}, ${input.availableFrom}, ${input.availableTo}, ${input.preferredLocationId}, ${vetoLocationId}, ${vetoReason})
      ON CONFLICT (event_id, participant_key) DO UPDATE SET
        name = ${input.name},
        status = ${input.status},
        available_from = ${input.availableFrom},
        available_to = ${input.availableTo},
        preferred_location_id = ${input.preferredLocationId},
        veto_location_id = ${vetoLocationId},
        veto_reason = ${vetoReason},
        updated_at = now()
      RETURNING id, (SELECT status FROM old) AS previous_status
    `,
    // History row only when the answer actually changed (status, time window, top pick,
    // or veto). Slider nudges that land on the same values and vote-only edits no longer
    // add rows, which keeps the table small and the Flip Flopper stat honest.
    sql`
      INSERT INTO response_history (response_id, event_id, participant_key, name, status, available_from, available_to, preferred_location_id, veto_location_id, veto_reason)
      SELECT r.id, ${eventId}, ${participantKey}, ${input.name}, ${input.status},
             ${input.availableFrom}::time, ${input.availableTo}::time,
             ${input.preferredLocationId}::uuid, ${vetoLocationId}::uuid, ${vetoReason}
      FROM responses r
      WHERE r.event_id = ${eventId} AND r.participant_key = ${participantKey}
        AND (
          SELECT h.status = ${input.status}
             AND h.available_from IS NOT DISTINCT FROM ${input.availableFrom}::time
             AND h.available_to IS NOT DISTINCT FROM ${input.availableTo}::time
             AND h.preferred_location_id IS NOT DISTINCT FROM ${input.preferredLocationId}::uuid
             AND h.veto_location_id IS NOT DISTINCT FROM ${vetoLocationId}::uuid
          FROM response_history h
          WHERE h.response_id = r.id
          ORDER BY h.changed_at DESC
          LIMIT 1
        ) IS DISTINCT FROM TRUE
    `,
    // Votes as a delta: drop the ones no longer selected, add the new ones. A vote that
    // stays selected keeps its original created_at, which the Trendsetter stat relies on.
    sql`
      DELETE FROM location_votes
      WHERE response_id = (SELECT id FROM responses WHERE event_id = ${eventId} AND participant_key = ${participantKey})
        AND NOT (location_id = ANY(${votes}::uuid[]))
    `,
    sql`
      INSERT INTO location_votes (response_id, location_id)
      SELECT r.id, l.id
      FROM responses r
      JOIN locations l ON l.event_id = r.event_id AND l.id = ANY(${votes}::uuid[])
      WHERE r.event_id = ${eventId} AND r.participant_key = ${participantKey}
      ON CONFLICT DO NOTHING
    `,
  ]);

  return rows[0] as { id: string; previous_status: string | null };
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

// Admin mutations below are scoped to the event whose passcode was checked,
// so one group's admin can't act on another group's rows by guessing IDs.

export async function adminDeleteLocation(eventId: string, locationId: string) {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM locations
    WHERE id = ${locationId} AND event_id = ${eventId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function updateLocationName(eventId: string, locationId: string, name: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE locations SET name = ${name}
    WHERE id = ${locationId} AND event_id = ${eventId}
    RETURNING *
  `;
  return rows[0] ? mapLocation(rows[0]) : null;
}

export async function deleteResponse(eventId: string, responseId: string) {
  const sql = getDb();
  await sql`
    DELETE FROM location_votes
    WHERE response_id = ${responseId}
      AND response_id IN (SELECT id FROM responses WHERE id = ${responseId} AND event_id = ${eventId})
  `;
  const rows = await sql`
    DELETE FROM responses
    WHERE id = ${responseId} AND event_id = ${eventId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function toggleResponseStatus(eventId: string, responseId: string, status: "in" | "out" | "maybe") {
  const sql = getDb();
  if (status !== "in") {
    // Clear votes, preference, and veto when toggling to out or maybe
    await sql`
      DELETE FROM location_votes
      WHERE response_id = ${responseId}
        AND response_id IN (SELECT id FROM responses WHERE id = ${responseId} AND event_id = ${eventId})
    `;
    const rows = await sql`
      UPDATE responses
      SET status = ${status}, preferred_location_id = NULL, veto_location_id = NULL, veto_reason = NULL, available_from = NULL, available_to = NULL, updated_at = now()
      WHERE id = ${responseId} AND event_id = ${eventId}
      RETURNING *
    `;
    return rows[0] || null;
  }
  const rows = await sql`
    UPDATE responses SET status = 'in', updated_at = now()
    WHERE id = ${responseId} AND event_id = ${eventId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function toggleNoShow(eventId: string, responseId: string, noShow: boolean) {
  const sql = getDb();
  const rows = await sql`
    UPDATE responses SET no_show = ${noShow}, updated_at = now()
    WHERE id = ${responseId} AND event_id = ${eventId}
    RETURNING *
  `;
  return rows[0] || null;
}

export async function finalizeEvent(id: string, chosenTime: string, chosenLocationId: string) {
  const sql = getDb();
  // The chosen location must belong to this event.
  const rows = await sql`
    UPDATE events
    SET status = 'finalized', chosen_time = ${chosenTime}, chosen_location_id = ${chosenLocationId}
    WHERE id = ${id}
      AND EXISTS (SELECT 1 FROM locations WHERE id = ${chosenLocationId} AND event_id = ${id})
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
  // Already a plain date (e.g. selected as date::text) — don't round-trip it through
  // a JS Date, which would shift it by the process timezone.
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
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

export async function cancelEvent(id: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE events
    SET status = 'cancelled'
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
    WHERE r.event_id = ANY(${eventIds}) AND r.status = 'in' AND r.no_show IS NOT TRUE
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

type LeaderboardEntry = { name: string; count: number };

function mapEntries(rows: Record<string, unknown>[]): LeaderboardEntry[] {
  return rows.map((r) => ({ name: r.name as string, count: r.count as number }));
}

/**
 * Every leaderboard stat in ONE request to Neon (sql.transaction batches the ten
 * queries into a single HTTPS call) instead of ten parallel round-trips.
 */
export async function getLeaderboard(groupId: string) {
  const sql = getDb();
  const [
    countRows, attendance, tastemaker, firstResponder, streakRows,
    speedDemon, fashionablyLate, trendsetter, coneOfShame, flipFlopper,
  ] = await sql.transaction([
    sql`SELECT COUNT(*)::int AS count FROM events WHERE status = 'finalized' AND group_id = ${groupId}`,
    // Attendance
    sql`
      SELECT MAX(r.name) AS name, COUNT(*)::int AS count
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in' AND r.no_show IS NOT TRUE
      GROUP BY LOWER(r.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Tastemaker: top pick matched the chosen venue
    sql`
      SELECT MAX(r.name) AS name, COUNT(*)::int AS count
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in'
        AND r.preferred_location_id IS NOT NULL
        AND r.preferred_location_id = e.chosen_location_id
      GROUP BY LOWER(r.name)
      ORDER BY count DESC, MIN(r.updated_at) ASC, name
      LIMIT 10
    `,
    // First responder
    sql`
      WITH first_responders AS (
        SELECT DISTINCT ON (r.event_id) r.name
        FROM responses r
        JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
        WHERE r.status = 'in'
        ORDER BY r.event_id, r.created_at
      )
      SELECT MAX(fr.name) AS name, COUNT(*)::int AS count
      FROM first_responders fr
      GROUP BY LOWER(fr.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Streaks (raw rows; computed below)
    sql`
      SELECT r.event_id, r.name, e.date
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in' AND r.no_show IS NOT TRUE
      ORDER BY e.date DESC
    `,
    // Speed demon: in within 5 minutes of go-live
    sql`
      SELECT MAX(r.name) AS name, COUNT(*)::int AS count
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in'
        AND r.created_at <= COALESCE(e.go_live_at, e.created_at) + INTERVAL '5 minutes'
      GROUP BY LOWER(r.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Fashionably late
    sql`
      WITH last_responders AS (
        SELECT DISTINCT ON (r.event_id) r.name
        FROM responses r
        JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
        WHERE r.status = 'in'
        ORDER BY r.event_id, r.created_at DESC
      )
      SELECT MAX(lr.name) AS name, COUNT(*)::int AS count
      FROM last_responders lr
      GROUP BY LOWER(lr.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Trendsetter: first vote for what became the chosen venue
    sql`
      WITH first_voters AS (
        SELECT DISTINCT ON (e.id) r.name
        FROM events e
        JOIN responses r ON r.event_id = e.id
        JOIN location_votes lv ON lv.response_id = r.id AND lv.location_id = e.chosen_location_id
        WHERE e.status = 'finalized'
          AND e.chosen_location_id IS NOT NULL
          AND e.group_id = ${groupId}
        ORDER BY e.id, lv.created_at ASC
      )
      SELECT MAX(fv.name) AS name, COUNT(*)::int AS count
      FROM first_voters fv
      GROUP BY LOWER(fv.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Cone of shame: said in, didn't show
    sql`
      SELECT MAX(r.name) AS name, COUNT(*)::int AS count
      FROM responses r
      JOIN events e ON e.id = r.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      WHERE r.status = 'in' AND r.no_show = TRUE
      GROUP BY LOWER(r.name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
    // Flip flopper: counts actual in/out/maybe changes (each history row compared with
    // the one before it), not every saved edit.
    sql`
      WITH ordered AS (
        SELECT rh.name, rh.status,
               LAG(rh.status) OVER (PARTITION BY rh.response_id ORDER BY rh.changed_at) AS prev_status
        FROM response_history rh
        JOIN events e ON e.id = rh.event_id AND e.status = 'finalized' AND e.group_id = ${groupId}
      )
      SELECT MAX(name) AS name, COUNT(*)::int AS count
      FROM ordered
      WHERE prev_status IS NOT NULL AND status <> prev_status
      GROUP BY LOWER(name)
      ORDER BY count DESC, name
      LIMIT 10
    `,
  ]);

  return {
    totalEvents: (countRows[0]?.count as number) ?? 0,
    attendance: mapEntries(attendance),
    tastemaker: mapEntries(tastemaker),
    firstResponder: mapEntries(firstResponder),
    streaks: computeStreaks(streakRows),
    speedDemon: mapEntries(speedDemon),
    fashionablyLate: mapEntries(fashionablyLate),
    trendsetter: mapEntries(trendsetter),
    coneOfShame: mapEntries(coneOfShame),
    flipFlopper: mapEntries(flipFlopper),
  };
}

/** Current consecutive-attendance streak per person, from rows ordered newest event first. */
function computeStreaks(rows: Record<string, unknown>[]): LeaderboardEntry[] {
  if (rows.length === 0) return [];

  const eventOrder: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const eid = row.event_id as string;
    if (!seen.has(eid)) { seen.add(eid); eventOrder.push(eid); }
  }

  const eventAttendees = new Map<string, Set<string>>();
  const displayNames = new Map<string, string>();
  const allNames = new Set<string>();
  for (const row of rows) {
    const eventId = row.event_id as string;
    const nameLower = (row.name as string).toLowerCase();
    if (!eventAttendees.has(eventId)) eventAttendees.set(eventId, new Set());
    eventAttendees.get(eventId)!.add(nameLower);
    allNames.add(nameLower);
    displayNames.set(nameLower, row.name as string);
  }

  const streaks = new Map<string, number>();
  for (const nameLower of allNames) {
    let streak = 0;
    for (const eventId of eventOrder) {
      const set = eventAttendees.get(eventId);
      if (set?.has(nameLower)) {
        streak++;
      } else {
        break;
      }
    }
    if (streak > 0) streaks.set(nameLower, streak);
  }

  if (streaks.size === 0) return [];

  const sorted = [...streaks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return sorted.map(([nameLower, count]) => ({
    name: displayNames.get(nameLower) || "Unknown",
    count,
  }));
}

// ── Response history queries ──────────────────────────────────

/** Housekeeping: history for cancelled events is never shown anywhere. */
export async function pruneResponseHistory(): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM response_history rh
    USING events e
    WHERE e.id = rh.event_id AND e.status = 'cancelled'
  `;
}

export async function getResponseHistory(eventId: string, name: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, response_id, event_id, name, status, available_from, available_to, preferred_location_id, changed_at FROM response_history
    WHERE event_id = ${eventId} AND LOWER(name) = LOWER(${name})
    ORDER BY changed_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    responseId: r.response_id as string,
    eventId: r.event_id as string,
    name: r.name as string,
    status: r.status as string,
    availableFrom: r.available_from ? normalizeTime(r.available_from) : null,
    availableTo: r.available_to ? normalizeTime(r.available_to) : null,
    preferredLocationId: r.preferred_location_id ? String(r.preferred_location_id) : null,
    changedAt: String(r.changed_at),
  }));
}

// ── Past locations query ──────────────────────────────────────

export async function getPastLocations(groupId: string, excludeEventId: string) {
  const sql = getDb();
  const rows = await sql`
    WITH agg AS (
      SELECT
        LOWER(l.name) AS name_key,
        COUNT(DISTINCT l.event_id)::int AS use_count,
        MAX(l.created_at) AS last_used,
        (ARRAY_AGG(l.name ORDER BY l.created_at DESC))[1] AS name,
        (ARRAY_AGG(l.address ORDER BY l.created_at DESC))[1] AS address,
        (ARRAY_AGG(l.maps_url ORDER BY l.created_at DESC))[1] AS maps_url,
        (ARRAY_AGG(l.website_url ORDER BY l.created_at DESC))[1] AS website_url
      FROM locations l
      JOIN events e ON e.id = l.event_id
      WHERE e.group_id = ${groupId}
        AND l.event_id != ${excludeEventId}
      GROUP BY LOWER(l.name)
    )
    SELECT name, address, maps_url, website_url, use_count
    FROM agg
    ORDER BY last_used DESC, use_count DESC, name
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
        SELECT participant_key, group_id, endpoint, p256dh, auth FROM push_subscriptions
        WHERE group_id = ${groupId} AND participant_key != ${excludeParticipantKey}
      `
    : await sql`
        SELECT participant_key, group_id, endpoint, p256dh, auth FROM push_subscriptions
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

// ── Recurring schedule queries ────────────────────────────────

export async function getRecurringSchedule(groupId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT id, group_id, day_of_week, title_template, earliest_time, latest_time, create_days_before, delay_window, delay_start_time, voting_deadline_time, active, last_created_date, created_at, updated_at FROM recurring_schedules WHERE group_id = ${groupId}
  `;
  return rows[0] ? mapRecurringSchedule(rows[0]) : null;
}

export async function upsertRecurringSchedule(
  groupId: string,
  input: {
    dayOfWeek: number;
    titleTemplate: string;
    earliestTime: string;
    latestTime: string;
    createDaysBefore: number;
    delayWindow: string;
    delayStartTime: string | null;
    votingDeadlineTime: string | null;
    active: boolean;
  }
) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO recurring_schedules (
      group_id, day_of_week, title_template, earliest_time, latest_time,
      create_days_before, delay_window, delay_start_time, voting_deadline_time, active
    ) VALUES (
      ${groupId}, ${input.dayOfWeek}, ${input.titleTemplate}, ${input.earliestTime},
      ${input.latestTime}, ${input.createDaysBefore}, ${input.delayWindow},
      ${input.delayStartTime}, ${input.votingDeadlineTime}, ${input.active}
    )
    ON CONFLICT (group_id) DO UPDATE SET
      day_of_week = EXCLUDED.day_of_week,
      title_template = EXCLUDED.title_template,
      earliest_time = EXCLUDED.earliest_time,
      latest_time = EXCLUDED.latest_time,
      create_days_before = EXCLUDED.create_days_before,
      delay_window = EXCLUDED.delay_window,
      delay_start_time = EXCLUDED.delay_start_time,
      voting_deadline_time = EXCLUDED.voting_deadline_time,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING *
  `;
  return rows[0] ? mapRecurringSchedule(rows[0]) : null;
}

export async function deleteRecurringSchedule(groupId: string) {
  const sql = getDb();
  await sql`DELETE FROM recurring_schedules WHERE group_id = ${groupId}`;
}

export async function getActiveRecurringSchedules() {
  const sql = getDb();
  const rows = await sql`
    SELECT rs.*, g.slug AS group_slug
    FROM recurring_schedules rs
    JOIN groups g ON g.id = rs.group_id
    WHERE rs.active = TRUE
  `;
  return rows.map((r) => ({
    ...mapRecurringSchedule(r),
    groupSlug: r.group_slug as string,
  }));
}

export async function eventExistsForDate(groupId: string, date: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT 1 FROM events
    WHERE group_id = ${groupId} AND date = ${date} AND status != 'cancelled'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function updateRecurringScheduleLastCreated(groupId: string, date: string) {
  const sql = getDb();
  await sql`
    UPDATE recurring_schedules
    SET last_created_date = ${date}, updated_at = now()
    WHERE group_id = ${groupId}
  `;
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
    goLiveAt: row.go_live_at ? String(row.go_live_at) : null,
    delayStartAt: row.delay_start_at ? String(row.delay_start_at) : null,
    delayEndAt: row.delay_end_at ? String(row.delay_end_at) : null,
    votingDeadline: row.voting_deadline ? String(row.voting_deadline) : null,
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
    addedByHash: row.added_by ? hashParticipantKey(String(row.added_by)) : null,
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
    participantHash: hashParticipantKey(String(row.participant_key)),
    name: row.name as string,
    status: (row.status as "in" | "out" | "maybe") || "out",
    availableFrom: row.available_from ? normalizeTime(row.available_from) : null,
    availableTo: row.available_to ? normalizeTime(row.available_to) : null,
    locationVotes: votes,
    preferredLocationId: row.preferred_location_id ? String(row.preferred_location_id) : null,
    vetoLocationId: row.veto_location_id ? String(row.veto_location_id) : null,
    vetoReason: row.veto_reason ? String(row.veto_reason) : null,
    noShow: row.no_show === true,
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
    locationLat: row.location_lat != null ? Number(row.location_lat) : null,
    locationLng: row.location_lng != null ? Number(row.location_lng) : null,
    locationName: (row.location_name as string) || null,
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

function mapRecurringSchedule(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    dayOfWeek: Number(row.day_of_week),
    titleTemplate: row.title_template as string,
    earliestTime: normalizeTime(row.earliest_time),
    latestTime: normalizeTime(row.latest_time),
    createDaysBefore: Number(row.create_days_before),
    delayWindow: row.delay_window as string,
    delayStartTime: row.delay_start_time ? normalizeTime(row.delay_start_time) : null,
    votingDeadlineTime: row.voting_deadline_time ? normalizeTime(row.voting_deadline_time) : null,
    active: row.active as boolean,
    lastCreatedDate: row.last_created_date ? normalizeDate(row.last_created_date) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
