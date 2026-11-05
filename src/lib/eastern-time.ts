/**
 * Eastern-time helpers that give the same answer in the browser, on Vercel (UTC),
 * and on a developer's Mac — none of them depend on the process timezone.
 *
 * The app's wall-clock times ("voting closes at 11:20") are always Eastern
 * (Granger, IN), while the database stores UTC instants.
 */

export const EASTERN_TZ = "America/Indiana/Indianapolis";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** The Eastern wall-clock reading of an instant, expressed as a UTC-millisecond number. */
function easternWallClockMs(instant: Date): number {
  const get = (type: string) =>
    Number(partsFormatter.formatToParts(instant).find((p) => p.type === type)?.value ?? "0");
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
}

/**
 * Convert an Eastern wall-clock date + time ("2026-11-05", "11:20") to a UTC ISO string.
 * DST-aware. Throws on malformed input so bad data never becomes a silent wrong time.
 */
export function easternToUtc(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if ([y, mo, d, h, mi].some((n) => !Number.isFinite(n))) {
    throw new Error(`easternToUtc: bad input ${date} ${time}`);
  }
  const wanted = Date.UTC(y, mo - 1, d, h, mi, 0);
  // First guess: treat the wall-clock as if it were UTC, measure how far off Eastern is,
  // then correct. A second pass settles the one-hour ambiguity around DST changes.
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    guess = guess - (easternWallClockMs(new Date(guess)) - wanted);
  }
  return new Date(guess).toISOString();
}

/** Today's date in Eastern time as "YYYY-MM-DD". */
export function easternToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: EASTERN_TZ });
}
