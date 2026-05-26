import { getDb } from "./db/client";
import { randomUUID } from "node:crypto";

const SLUG = "demo";
const TZ = "America/Indiana/Indianapolis";

function nextThursdayISO(): string {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const today = new Date(todayStr + "T12:00:00");
  let daysUntil = 4 - today.getDay();
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) daysUntil = 7;
  today.setDate(today.getDate() + daysUntil);
  return today.toISOString().slice(0, 10);
}

function isThursdayPastNoonET(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  return weekday === "Thu" && hour >= 12;
}

const LOCATIONS = [
  { name: "Bob Evans", address: "12835 SR-23, Granger, IN 46530" },
  { name: "Bonefish Grill", address: "1234 N Main St, Mishawaka, IN" },
  { name: "Texas Roadhouse", address: "7510 N Main St, Granger, IN" },
  { name: "Olive Garden", address: "6701 Grape Rd, Mishawaka, IN" },
  { name: "Panera Bread", address: "6502 N Grape Rd, Mishawaka, IN" },
];

const RESPONSES = [
  { name: "Sarah K",  status: "in",    from: "11:30", to: "13:00", votes: [0, 2],     preferred: 2 },
  { name: "Mike T",   status: "in",    from: "12:00", to: "13:30", votes: [0, 1, 3],  preferred: null },
  { name: "Jenny L",  status: "maybe", from: null,    to: null,    votes: [3, 4],     preferred: null },
  { name: "Brian P",  status: "in",    from: "11:30", to: "12:30", votes: [0, 2, 4],  preferred: 0 },
  { name: "Ashley W", status: "out",   from: null,    to: null,    votes: [],         preferred: null },
  { name: "Dave R",   status: "in",    from: "12:00", to: "13:30", votes: [1, 3],     preferred: null },
  { name: "Karen S",  status: "in",    from: "11:30", to: "13:00", votes: [2],        preferred: 2 },
  { name: "Tom H",    status: "maybe", from: null,    to: null,    votes: [4],        preferred: null },
];

/** Seed (or reseed) the demo group with a fresh open event + realistic fake data. */
export async function seedDemoGroup(): Promise<{ seeded: boolean; reason: string; eventDate?: string }> {
  const sql = getDb();
  const groupRows = await sql`SELECT id FROM groups WHERE slug = ${SLUG}`;
  if (groupRows.length === 0) return { seeded: false, reason: "demo group not found" };
  const groupId = groupRows[0].id as string;

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });

  // Idempotency: if there's already an open demo event for a future date, skip.
  const openRows = await sql`
    SELECT date FROM events
    WHERE group_id = ${groupId} AND status = 'open'
    ORDER BY date DESC LIMIT 1
  `;
  if (openRows.length > 0) {
    const openDateStr = String(openRows[0].date).slice(0, 10);
    if (openDateStr > todayStr) {
      return { seeded: false, reason: `already have open event for ${openDateStr}` };
    }
  }

  // Cancel any currently-open demo events
  await sql`UPDATE events SET status = 'cancelled' WHERE group_id = ${groupId} AND status = 'open'`;

  const eventDate = nextThursdayISO();
  const eventRows = await sql`
    INSERT INTO events (title, date, earliest_time, latest_time, status, group_id, go_live_at, notifications_sent, heads_up_sent)
    VALUES ('Demo Lunch', ${eventDate}, '11:30', '13:30', 'open', ${groupId}, NULL, TRUE, TRUE)
    RETURNING id
  `;
  const eventId = eventRows[0].id as string;

  const locationIds: string[] = [];
  for (const loc of LOCATIONS) {
    const row = await sql`
      INSERT INTO locations (event_id, name, address)
      VALUES (${eventId}, ${loc.name}, ${loc.address})
      RETURNING id
    `;
    locationIds.push(row[0].id as string);
  }

  for (const r of RESPONSES) {
    const participantKey = `demo-${randomUUID()}`;
    const preferredLocId = r.preferred !== null ? locationIds[r.preferred] : null;
    const respRow = await sql`
      INSERT INTO responses (event_id, participant_key, name, status, available_from, available_to, preferred_location_id)
      VALUES (${eventId}, ${participantKey}, ${r.name}, ${r.status}, ${r.from}, ${r.to}, ${preferredLocId})
      RETURNING id
    `;
    const respId = respRow[0].id as string;
    for (const v of r.votes) {
      await sql`INSERT INTO location_votes (response_id, location_id) VALUES (${respId}, ${locationIds[v]})`;
    }
  }

  return { seeded: true, reason: "reseeded", eventDate };
}

/** Called by cron — only runs at Thursday noon ET, otherwise no-ops. */
export async function maybeReseedDemo(): Promise<{ ran: boolean; result?: Awaited<ReturnType<typeof seedDemoGroup>> }> {
  if (!isThursdayPastNoonET()) return { ran: false };
  const result = await seedDemoGroup();
  return { ran: true, result };
}
