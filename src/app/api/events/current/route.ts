import { NextRequest, NextResponse } from "next/server";
import { getCurrentEvent, getEventSnapshot, getGroupBySlug } from "@/lib/db/queries";

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
