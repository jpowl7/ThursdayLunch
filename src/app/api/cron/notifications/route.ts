import { NextResponse } from "next/server";
import { getAllGroupIds, claimGoLiveNotifications, claimHeadsUpNotifications } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";
import { processAutoFinalizeAll } from "@/lib/auto-finalize";
import { processRecurringSchedules } from "@/lib/recurring-events";

export async function GET() {
  // Public endpoint — safe because claim queries are atomic and idempotent

  const groups = await getAllGroupIds();
  let goLiveCount = 0;
  let headsUpCount = 0;

  for (const group of groups) {
    // Check go-live notifications
    const claimed = await claimGoLiveNotifications(group.id);
    if (claimed) {
      goLiveCount++;
      await sendPushToGroup(group.id, {
        title: "Thursday lunch is on!",
        body: "Vote now.",
        url: `/g/${group.slug}`,
        tag: `event-${claimed.id}`,
      });
    }

    // Check heads-up notifications
    const headsUp = await claimHeadsUpNotifications(group.id);
    if (headsUp) {
      headsUpCount++;
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Indiana/Indianapolis" });
      const windowStart = headsUp.delay_start_at ? fmt(new Date(String(headsUp.delay_start_at))) : "";
      const windowEnd = headsUp.delay_end_at ? fmt(new Date(String(headsUp.delay_end_at))) : "";
      const dateStr = String(headsUp.date);
      const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const eventDate = new Date(dateOnly + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      await sendPushToGroup(group.id, {
        title: String(headsUp.title),
        body: `Lunch for ${eventDate} will randomly open for voting between ${windowStart} and ${windowEnd}`,
        url: `/g/${group.slug}`,
        tag: `event-headsup-${headsUp.id}`,
      });
    }
  }

  // Check for events past their voting deadline
  const autoFinalizeCount = await processAutoFinalizeAll();

  // Auto-create events from recurring schedules
  const recurringCount = await processRecurringSchedules();

  return NextResponse.json({ ok: true, goLiveCount, headsUpCount, autoFinalizeCount, recurringCount });
}
