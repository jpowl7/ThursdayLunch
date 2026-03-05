import { NextRequest, NextResponse } from "next/server";
import { getGroupByEventId, getPastLocations } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const pastLocations = await getPastLocations(group.id, id);
    return NextResponse.json(pastLocations);
  } catch (error) {
    console.error("Error fetching past locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
