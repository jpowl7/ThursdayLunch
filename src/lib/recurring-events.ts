import {
  getActiveRecurringSchedules,
  eventExistsForDate,
  createEvent,
  updateRecurringScheduleLastCreated,
} from "./db/queries";
import { sendPushToGroup } from "./push";
import { notifyOwner } from "./owner-email";
import { EASTERN_TZ as TZ, easternToUtc, easternToday } from "./eastern-time";
import { invalidatePendingInstants } from "./cron-pending";

/**
 * Get the next occurrence of a given day_of_week (0=Sun, 4=Thu)
 * on or after today in Eastern time. Returns "YYYY-MM-DD".
 */
function getNextEventDate(dayOfWeek: number): string {
  const today = new Date(easternToday() + "T12:00:00");
  const todayDow = today.getDay();
  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil < 0) daysUntil += 7;
  // If today IS the target day, return today (event might still need creating)
  const next = new Date(today);
  if (daysUntil > 0) next.setDate(today.getDate() + daysUntil);
  return next.toISOString().split("T")[0];
}

/** Format a date string as "Apr 9" */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function processRecurringSchedules(): Promise<number> {
  const schedules = await getActiveRecurringSchedules();
  let count = 0;

  for (const schedule of schedules) {
    try {
      const nextEventDate = getNextEventDate(schedule.dayOfWeek);

      // How many days until the event?
      const nowDate = new Date(easternToday() + "T12:00:00");
      const eventDate = new Date(nextEventDate + "T12:00:00");
      const daysUntil = Math.round(
        (eventDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only create if we're within the create_days_before window
      if (daysUntil > schedule.createDaysBefore) continue;

      // Idempotency: already created for this date?
      if (schedule.lastCreatedDate && schedule.lastCreatedDate >= nextEventDate) continue;

      // Idempotency: event already exists for this date?
      const exists = await eventExistsForDate(schedule.groupId, nextEventDate);
      if (exists) {
        await updateRecurringScheduleLastCreated(schedule.groupId, nextEventDate);
        continue;
      }

      // Build title
      const title = `${schedule.titleTemplate} \u2014 ${formatDateShort(nextEventDate)}`;

      // Compute delay window timestamps
      let goLiveAt: string | null = null;
      let delayStartAt: string | null = null;
      let delayEndAt: string | null = null;

      if (schedule.delayWindow !== "none") {
        const windowMs = parseInt(schedule.delayWindow) * 60 * 1000;
        const delayMs = Math.floor(Math.random() * windowMs);
        const baseTime = schedule.delayStartTime || "09:00";
        const baseUtc = easternToUtc(nextEventDate, baseTime);
        const baseMs = new Date(baseUtc).getTime();

        goLiveAt = new Date(baseMs + delayMs).toISOString();
        delayStartAt = baseUtc;
        delayEndAt = new Date(baseMs + windowMs).toISOString();
      }

      // Compute voting deadline
      let votingDeadline: string | null = null;
      if (schedule.votingDeadlineTime) {
        votingDeadline = easternToUtc(nextEventDate, schedule.votingDeadlineTime);
      }

      // Create event with no locations
      const snapshot = await createEvent(
        {
          title,
          date: nextEventDate,
          earliestTime: schedule.earliestTime,
          latestTime: schedule.latestTime,
          goLiveAt,
          delayStartAt,
          delayEndAt,
          votingDeadline,
        },
        [],
        schedule.groupId
      );

      await updateRecurringScheduleLastCreated(schedule.groupId, nextEventDate);
      // The new event's go-live time / deadline must reach the cron's cached pending list.
      invalidatePendingInstants();

      await notifyOwner(
        `[ilikelunch] Recurring meal auto-created: ${schedule.groupSlug}`,
        `A recurring meal was just auto-created.\n\nGroup: ${schedule.groupSlug}\nTitle: ${title}\nDate: ${nextEventDate}\nGoes live: ${goLiveAt ? new Date(goLiveAt).toLocaleString("en-US", { timeZone: TZ }) : "immediately"}\nURL: https://ilikelunch.com/g/${schedule.groupSlug}`
      );

      // Send push for non-delayed events
      if (!goLiveAt && snapshot?.event) {
        await sendPushToGroup(schedule.groupId, {
          title: `${schedule.titleTemplate} is on!`,
          body: "Suggest restaurants and vote.",
          url: `/g/${schedule.groupSlug}`,
          tag: `event-${snapshot.event.id}`,
        });
      }

      count++;
    } catch (error) {
      console.error(
        `Error processing recurring schedule for group ${schedule.groupId}:`,
        error
      );
    }
  }

  return count;
}
