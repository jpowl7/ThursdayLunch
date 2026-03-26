import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getCurrentEvent, getEventSnapshot, getGroupBySlug, claimGoLiveNotifications, claimHeadsUpNotifications } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";
import { processAutoFinalizeForGroup } from "@/lib/auto-finalize";

export async function GET(request: NextRequest) {
  try {
    const groupSlug = request.nextUrl.searchParams.get("group");
    if (!groupSlug) {
      return NextResponse.json({ error: "Missing group parameter" }, { status: 400 });
    }

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check for events that just went live and need notifications
    after(async () => {
      const claimed = await claimGoLiveNotifications(group.id);
      if (claimed) {
        await sendPushToGroup(group.id, {
          title: "Thursday lunch is on!",
          body: "Vote now.",
          url: `/g/${groupSlug}`,
          tag: `event-${claimed.id}`,
        });
      }

      // Check for heads-up notifications (5 min before delay window)
      const headsUp = await claimHeadsUpNotifications(group.id);
      if (headsUp) {
        const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Indiana/Indianapolis" });
        const windowStart = headsUp.delay_start_at ? fmt(new Date(String(headsUp.delay_start_at))) : "";
        const windowEnd = headsUp.delay_end_at ? fmt(new Date(String(headsUp.delay_end_at))) : "";
        const eventDate = new Date(String(headsUp.date)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Indiana/Indianapolis" });

        await sendPushToGroup(group.id, {
          title: String(headsUp.title),
          body: `Lunch for ${eventDate} will randomly open for voting between ${windowStart} and ${windowEnd}`,
          url: `/g/${groupSlug}`,
          tag: `event-headsup-${headsUp.id}`,
        });
      }

      // Check for events past their voting deadline
      await processAutoFinalizeForGroup(group.id, groupSlug);
    });

    const event = await getCurrentEvent(group.id);
    if (!event) {
      return NextResponse.json({ error: "No open event found" }, { status: 404 });
    }

    const snapshot = await getEventSnapshot(event.id as string);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Error fetching current event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
