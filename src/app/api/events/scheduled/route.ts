import { NextRequest, NextResponse } from "next/server";
import { getScheduledEvent, getEventSnapshot, getGroupBySlug } from "@/lib/db/queries";

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
