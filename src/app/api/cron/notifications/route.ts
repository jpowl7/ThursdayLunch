import { NextResponse } from "next/server";
import { getAllGroupIds, claimGoLiveNotifications, pruneAuthAttempts, pruneResponseHistory } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";
import { processAutoFinalizeAll } from "@/lib/auto-finalize";
import { processRecurringSchedules } from "@/lib/recurring-events";
import { maybeReseedDemo } from "@/lib/demo-seed";
import { cronPlan } from "@/lib/cron-window";
import { getCachedPendingInstants, invalidatePendingInstants } from "@/lib/cron-pending";

export async function GET(request: Request) {
  // Fail closed: without a configured secret nobody can trigger this endpoint.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip the database entirely unless something can be due, so Neon's compute can
  // suspend. The pending list comes from Next's data cache, not a live query.
  // See src/lib/cron-window.ts and src/lib/cron-pending.ts.
  let pending: string[] = [];
  try {
    pending = await getCachedPendingInstants();
  } catch (error) {
    console.error("Could not read pending cron instants; falling back to the Thursday window:", error);
  }
  const plan = cronPlan(new Date(), pending);
  if (plan === "skip") {
    return NextResponse.json({ ok: true, plan, pending });
  }
  if (plan === "create-only") {
    const recurringCount = await processRecurringSchedules();
    // Once-a-day housekeeping: expired lockout rows, history of cancelled events.
    await pruneAuthAttempts();
    await pruneResponseHistory();
    return NextResponse.json({ ok: true, plan, recurringCount });
  }

  // plan === "full" — run the whole lifecycle.
  const groups = await getAllGroupIds();
  let goLiveCount = 0;

  for (const group of groups) {
    // Check go-live notifications
    const claimed = await claimGoLiveNotifications(group.id);
    if (claimed) {
      goLiveCount++;
      await sendPushToGroup(group.id, {
        title: "Lunch is on!",
        body: "Vote now.",
        url: `/g/${group.slug}`,
        tag: `event-${claimed.id}`,
      });
    }

  }

  // Check for events past their voting deadline
  const autoFinalizeCount = await processAutoFinalizeAll();

  // Auto-create events from recurring schedules
  const recurringCount = await processRecurringSchedules();

  // Reseed demo group on Thursday at noon ET (idempotent)
  const demoReseed = await maybeReseedDemo();

  // Something was consumed, so the cached pending list is stale; refresh it next tick.
  if (goLiveCount > 0 || autoFinalizeCount > 0) {
    invalidatePendingInstants();
  }

  return NextResponse.json({ ok: true, plan, goLiveCount, autoFinalizeCount, recurringCount, demoReseed });
}
