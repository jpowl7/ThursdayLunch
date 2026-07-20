const TZ = "America/Indiana/Indianapolis";

export type CronPlan = "full" | "create-only" | "skip";

/** Eastern-time weekday + hour + minute, DST-aware. */
function easternParts(now: Date): { weekday: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    hour: parseInt(get("hour") || "0", 10) % 24, // hour12:false can emit "24" at midnight
    minute: parseInt(get("minute") || "0", 10),
  };
}

// The only day with live voting activity (recurring schedule day_of_week = 4 = Thursday).
const ACTIVE_WEEKDAY = "Thu";
// Full window covers the whole Thursday-morning lifecycle in Eastern time, with margin:
//   heads-up (~9:25), go-live (9:30–10:00), voting deadline (11:20), noon demo reseed.
const FULL_START_HOUR = 8; // 8:00 AM ET
const FULL_END_HOUR = 13; // exclusive → runs through 12:59 PM ET
// One brief pass each morning so schedules that create events ahead of time
// (create_days_before > 0, set in the admin UI) still fire on non-Thursday days.
const CREATE_CHECK_HOUR = 8;

/**
 * Decide how much cron work to do — computed purely from the clock, with NO database
 * access, so the database stays asleep outside the windows that can actually have work.
 *
 * - "full": run everything (go-live / heads-up pushes, auto-finalize, recurring creation,
 *   demo reseed). Only during the Thursday-morning window.
 * - "create-only": run just the recurring-event check, so a schedule configured to create
 *   its event a few days early still fires. One tick per day.
 * - "skip": do nothing and return immediately, leaving the database suspended.
 */
export function cronPlan(now: Date = new Date()): CronPlan {
  const { weekday, hour, minute } = easternParts(now);

  if (weekday === ACTIVE_WEEKDAY && hour >= FULL_START_HOUR && hour < FULL_END_HOUR) {
    return "full";
  }
  // Only the top-of-hour tick (cron fires every 5 min: :00, :05, …) so this is one pass/day.
  if (hour === CREATE_CHECK_HOUR && minute < 5) {
    return "create-only";
  }
  return "skip";
}
