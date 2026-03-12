import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getScheduledEvent, getEventSnapshot, getGroupBySlug, claimHeadsUpNotifications } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    const groupSlug = request.nextUrl.searchParams.get("group");
    if (!groupSlug) {
      return NextResponse.json({ error: "Missing group parameter" }, { status: 400 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.passcode !== "" && group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for heads-up notifications (5 min before delay window)
    after(async () => {
      const headsUp = await claimHeadsUpNotifications(group.id);
      if (headsUp) {
        const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const windowStart = headsUp.delay_start_at ? fmt(new Date(String(headsUp.delay_start_at))) : "";
        const windowEnd = headsUp.delay_end_at ? fmt(new Date(String(headsUp.delay_end_at))) : "";
        const eventDate = new Date(String(headsUp.date) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        await sendPushToGroup(group.id, {
          title: String(headsUp.title),
          body: `Lunch for ${eventDate} will randomly open for voting between ${windowStart} and ${windowEnd}`,
          url: `/g/${groupSlug}`,
          tag: `event-headsup-${headsUp.id}`,
        });
      }
    });

    const event = await getScheduledEvent(group.id);
    if (!event) {
      return NextResponse.json(null);
    }

    const snapshot = await getEventSnapshot(event.id as string);
    return NextResponse.json({ ...snapshot, scheduled: true });
  } catch (error) {
    console.error("Error fetching scheduled event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
