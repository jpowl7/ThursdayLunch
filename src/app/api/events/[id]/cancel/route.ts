import { NextRequest, NextResponse } from "next/server";
import { cancelEvent, getEventById, getGroupByEventId } from "@/lib/db/queries";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (group.passcode !== "" && group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updated = await cancelEvent(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error cancelling event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
