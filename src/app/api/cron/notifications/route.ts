import { NextResponse } from "next/server";
import { getAllGroupIds, claimGoLiveNotifications } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";
import { processAutoFinalizeAll } from "@/lib/auto-finalize";
import { processRecurringSchedules } from "@/lib/recurring-events";
import { maybeReseedDemo } from "@/lib/demo-seed";
import { cronPlan } from "@/lib/cron-window";

export async function GET(request: Request) {
  // Fail closed: without a configured secret nobody can trigger this endpoint.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip the database entirely outside the windows where work can exist, so Neon's
  // compute can suspend. See src/lib/cron-window.ts.
  const plan = cronPlan();
  if (plan === "skip") {
    return NextResponse.json({ ok: true, plan });
  }
  if (plan === "create-only") {
    const recurringCount = await processRecurringSchedules();
    return NextResponse.json({ ok: true, plan, recurringCount });
  }

  // plan === "full" — Thursday-morning window: run the whole lifecycle.
  const groups = await getAllGroupIds();
  let goLiveCount = 0;

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

  }

  // Check for events past their voting deadline
  const autoFinalizeCount = await processAutoFinalizeAll();

  // Auto-create events from recurring schedules
  const recurringCount = await processRecurringSchedules();

  // Reseed demo group on Thursday at noon ET (idempotent)
  const demoReseed = await maybeReseedDemo();

  return NextResponse.json({ ok: true, plan, goLiveCount, autoFinalizeCount, recurringCount, demoReseed });
}
