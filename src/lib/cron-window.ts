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

// The original group's weekly lifecycle (recurring schedule day_of_week = 4 = Thursday).
const ACTIVE_WEEKDAY = "Thu";
// Full window covers the whole Thursday-morning lifecycle in Eastern time, with margin:
//   go-live (9:30–10:00), voting deadline (11:20), noon demo reseed.
const FULL_START_HOUR = 8; // 8:00 AM ET
const FULL_END_HOUR = 13; // exclusive → runs through 12:59 PM ET
// One brief pass each morning so schedules that create events ahead of time
// (create_days_before > 0, set in the admin UI) still fire on non-Thursday days.
const CREATE_CHECK_HOUR = 8;

// Any other day: wake up only around a specific pending instant (a go-live time or a
// voting deadline, see src/lib/cron-pending.ts). The cron fires every 5 minutes, so a
// short lead plus a generous tail guarantees at least a few ticks land inside the window
// even if one tick fails.
const PENDING_LEAD_MS = 1 * 60 * 1000;
const PENDING_TAIL_MS = 20 * 60 * 1000;

/**
 * Decide how much cron work to do, from the clock plus the cached list of upcoming
 * go-live/deadline instants — never from a live database query — so the database stays
 * asleep whenever nothing can be due.
 *
 * - "full": run everything (go-live pushes, auto-finalize, recurring creation,
 *   demo reseed). During the Thursday-morning window, or when a pending instant is due.
 * - "create-only": run just the recurring-event check, so a schedule configured to create
 *   its event a few days early still fires. One tick per day.
 * - "skip": do nothing and return immediately, leaving the database suspended.
 */
export function cronPlan(now: Date = new Date(), pendingInstants: readonly string[] = []): CronPlan {
  const { weekday, hour, minute } = easternParts(now);

  if (weekday === ACTIVE_WEEKDAY && hour >= FULL_START_HOUR && hour < FULL_END_HOUR) {
    return "full";
  }
  if (hasDuePendingInstant(now, pendingInstants)) {
    return "full";
  }
  // Only the top-of-hour tick (cron fires every 5 min: :00, :05, …) so this is one pass/day.
  if (hour === CREATE_CHECK_HOUR && minute < 5) {
    return "create-only";
  }
  return "skip";
}

/** True when `now` falls inside [instant − lead, instant + tail) for any pending instant. */
export function hasDuePendingInstant(now: Date, pendingInstants: readonly string[]): boolean {
  const nowMs = now.getTime();
  for (const iso of pendingInstants) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;
    if (nowMs >= t - PENDING_LEAD_MS && nowMs < t + PENDING_TAIL_MS) return true;
  }
  return false;
}
