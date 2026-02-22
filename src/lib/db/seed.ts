import { neon } from "@neondatabase/serverless";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);

  // Reuse existing open event, or create a new one
  const existing = await sql`SELECT * FROM events WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`;

  let eventId: string;
  let thaiId: string;
  let burgerId: string;
  let sushiId: string;

  if (existing.length > 0) {
    eventId = existing[0].id;
    console.log("Using existing open event:", eventId);

    // Get or create locations
    const existingLocs = await sql`SELECT * FROM locations WHERE event_id = ${eventId}`;
    const locByName = new Map(existingLocs.map((l: Record<string, unknown>) => [l.name, l.id as string]));

    if (!locByName.has("Thai Palace")) {
      const r = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Thai Palace', '123 Main St') RETURNING id`;
      locByName.set("Thai Palace", r[0].id);
    }
    if (!locByName.has("Burger Barn")) {
      const r = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Burger Barn', '456 Oak Ave') RETURNING id`;
      locByName.set("Burger Barn", r[0].id);
    }
    if (!locByName.has("Sushi Express")) {
      const r = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Sushi Express', '789 Pine Blvd') RETURNING id`;
      locByName.set("Sushi Express", r[0].id);
    }

    thaiId = locByName.get("Thai Palace")!;
    burgerId = locByName.get("Burger Barn")!;
    sushiId = locByName.get("Sushi Express")!;
  } else {
    // Create a new event for next Thursday
    const today = new Date();
    const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + daysUntilThursday);
    const dateStr = nextThursday.toISOString().split("T")[0];

    const eventRows = await sql`
      INSERT INTO events (title, date, earliest_time, latest_time)
      VALUES (${`Thursday Lunch — ${nextThursday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}, ${dateStr}, '11:00', '13:30')
      RETURNING *
    `;
    eventId = eventRows[0].id;

    const loc1 = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Thai Palace', '123 Main St') RETURNING id`;
    const loc2 = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Burger Barn', '456 Oak Ave') RETURNING id`;
    const loc3 = await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Sushi Express', '789 Pine Blvd') RETURNING id`;

    thaiId = loc1[0].id;
    burgerId = loc2[0].id;
    sushiId = loc3[0].id;
  }

  // Remove any previous seed responses (won't touch real users)
  await sql`DELETE FROM location_votes WHERE response_id IN (SELECT id FROM responses WHERE event_id = ${eventId} AND participant_key LIKE 'seed-%')`;
  await sql`DELETE FROM responses WHERE event_id = ${eventId} AND participant_key LIKE 'seed-%'`;

  // Add test participants
  const users = [
    { key: "seed-alice-001", name: "Alice", isIn: true, from: "11:30", to: "12:30", votes: [thaiId, sushiId], preferred: thaiId },
    { key: "seed-bob-002", name: "Bob", isIn: true, from: "12:00", to: "13:00", votes: [burgerId, thaiId], preferred: burgerId },
    { key: "seed-carol-003", name: "Carol", isIn: true, from: "11:00", to: "12:30", votes: [sushiId], preferred: sushiId },
    { key: "seed-dave-004", name: "Dave", isIn: true, from: "11:30", to: "13:00", votes: [thaiId, burgerId, sushiId], preferred: null },
    { key: "seed-eve-005", name: "Eve", isIn: false, from: null, to: null, votes: [], preferred: null },
  ];

  for (const u of users) {
    const res = await sql`
      INSERT INTO responses (event_id, participant_key, name, is_in, available_from, available_to, preferred_location_id)
      VALUES (${eventId}, ${u.key}, ${u.name}, ${u.isIn}, ${u.from}, ${u.to}, ${u.preferred})
      RETURNING id
    `;
    for (const locId of u.votes) {
      await sql`INSERT INTO location_votes (response_id, location_id) VALUES (${res[0].id}, ${locId})`;
    }
  }

  console.log("Seed complete! Event ID:", eventId);
  console.log("  5 test users: Alice (in), Bob (in), Carol (in), Dave (in), Eve (out)");
}

seed().catch(console.error);
