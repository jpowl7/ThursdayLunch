import { NextRequest, NextResponse } from "next/server";
import { getParticipantByName, hasConflictingResponse } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const participantKey = searchParams.get("participantKey");
  const eventId = searchParams.get("eventId");

  if (!name || name.length > 50) {
    return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 });
  }

  try {
    // Check if name is formally registered in participants table
    const participant = await getParticipantByName(name);
    if (participant) {
      const isOwner = participant.participantKey === participantKey;
      return NextResponse.json({ registered: true, isOwner, conflict: false });
    }

    // Check if name is already used on this event by a different participant_key
    if (eventId && participantKey) {
      const conflict = await hasConflictingResponse(eventId, participantKey, name);
      if (conflict) {
        return NextResponse.json({ registered: false, isOwner: false, conflict: true });
      }
    }

    return NextResponse.json({ registered: false, isOwner: false, conflict: false });
  } catch (error) {
    console.error("Error checking participant name:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
