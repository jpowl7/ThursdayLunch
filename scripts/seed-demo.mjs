// Reset the "demo" group with a fresh open event + realistic fake data.
// Run: node scripts/seed-demo.mjs
// Safe to re-run: closes any open demo event, leaves finalized history alone,
// then creates a new open event for the next upcoming Thursday.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const dbUrl = readFileSync(".env.local", "utf8")
  .match(/^DATABASE_URL=(.+)$/m)[1]
  .trim()
  .replace(/^"|"$/g, "");
const sql = neon(dbUrl);

const SLUG = "demo";

function nextThursdayISO() {
  const now = new Date();
  const today = new Date(now.toLocaleDateString("en-CA", { timeZone: "America/Indiana/Indianapolis" }) + "T12:00:00");
  let daysUntil = 4 - today.getDay(); // 4 = Thursday
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) daysUntil = 7; // skip today if already Thursday
  today.setDate(today.getDate() + daysUntil);
  return today.toISOString().slice(0, 10);
}

const group = (await sql`SELECT id FROM groups WHERE slug = ${SLUG}`)[0];
if (!group) throw new Error("demo group not found");
const groupId = group.id;

// Close any currently-open events (preserve finalized history)
const closed = await sql`UPDATE events SET status = 'cancelled' WHERE group_id = ${groupId} AND status = 'open' RETURNING id`;
console.log(`Closed ${closed.length} previously-open demo event(s)`);

// Create the new open event
const eventDate = nextThursdayISO();
const eventRows = await sql`
  INSERT INTO events (title, date, earliest_time, latest_time, status, group_id, go_live_at, notifications_sent, heads_up_sent)
  VALUES ('Demo Lunch', ${eventDate}, '11:30', '13:30', 'open', ${groupId}, NULL, TRUE, TRUE)
  RETURNING id
`;
const eventId = eventRows[0].id;
console.log(`Created event ${eventId} for ${eventDate}`);

// Locations (Granger IN area)
const locationDefs = [
  { name: "Bob Evans", address: "12835 SR-23, Granger, IN 46530" },
  { name: "Bonefish Grill", address: "1234 N Main St, Mishawaka, IN" },
  { name: "Texas Roadhouse", address: "7510 N Main St, Granger, IN" },
  { name: "Olive Garden", address: "6701 Grape Rd, Mishawaka, IN" },
  { name: "Panera Bread", address: "6502 N Grape Rd, Mishawaka, IN" },
];

const locationIds = [];
for (const loc of locationDefs) {
  const row = (await sql`
    INSERT INTO locations (event_id, name, address)
    VALUES (${eventId}, ${loc.name}, ${loc.address})
    RETURNING id
  `)[0];
  locationIds.push(row.id);
}
console.log(`Added ${locationIds.length} locations`);

// Participant responses — realistic mix
const responses = [
  { name: "Sarah K", status: "in",    from: "11:30", to: "13:00", votes: [0, 2],        preferred: 2 },
  { name: "Mike T",  status: "in",    from: "12:00", to: "13:30", votes: [0, 1, 3],     preferred: null },
  { name: "Jenny L", status: "maybe", from: null,    to: null,    votes: [3, 4],        preferred: null },
  { name: "Brian P", status: "in",    from: "11:30", to: "12:30", votes: [0, 2, 4],     preferred: 0 },
  { name: "Ashley W",status: "out",   from: null,    to: null,    votes: [],            preferred: null },
  { name: "Dave R",  status: "in",    from: "12:00", to: "13:30", votes: [1, 3],        preferred: null },
  { name: "Karen S", status: "in",    from: "11:30", to: "13:00", votes: [2],           preferred: 2 },
  { name: "Tom H",   status: "maybe", from: null,    to: null,    votes: [4],           preferred: null },
];

for (const r of responses) {
  const participantKey = `demo-${randomUUID()}`;
  const preferredLocId = r.preferred !== null ? locationIds[r.preferred] : null;
  const respRow = (await sql`
    INSERT INTO responses (event_id, participant_key, name, status, available_from, available_to, preferred_location_id)
    VALUES (${eventId}, ${participantKey}, ${r.name}, ${r.status}, ${r.from}, ${r.to}, ${preferredLocId})
    RETURNING id
  `)[0];
  for (const v of r.votes) {
    await sql`INSERT INTO location_votes (response_id, location_id) VALUES (${respRow.id}, ${locationIds[v]})`;
  }
}
console.log(`Added ${responses.length} responses with votes`);

console.log(`\nDemo group seeded. Open: https://ilikelunch.com/g/${SLUG}`);
