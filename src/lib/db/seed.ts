import { neon } from "@neondatabase/serverless";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);

  // Cancel any open events
  await sql`UPDATE events SET status = 'cancelled' WHERE status = 'open'`;

  // Create a sample event for next Thursday
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

  const eventId = eventRows[0].id;

  // Add sample locations
  await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Thai Palace', '123 Main St')`;
  await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Burger Barn', '456 Oak Ave')`;
  await sql`INSERT INTO locations (event_id, name, address) VALUES (${eventId}, 'Sushi Express', '789 Pine Blvd')`;

  console.log("Seed complete! Event ID:", eventId);
}

seed().catch(console.error);
