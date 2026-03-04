import { NextRequest, NextResponse } from "next/server";
import { getParticipantByName, getEventSnapshot } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const participantKey = searchParams.get("participantKey");
  const eventId = searchParams.get("eventId");

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  // Check if name is formally registered in participants table
  const participant = await getParticipantByName(name);
  if (participant) {
    const isOwner = participant.participantKey === participantKey;
    return NextResponse.json({ registered: true, isOwner, conflict: false });
  }

  // Check if name is already used on this event by a different participant_key
  if (eventId && participantKey) {
    const snapshot = await getEventSnapshot(eventId);
    if (snapshot) {
      const conflict = snapshot.responses.some(
        (r) => r.name.toLowerCase() === name.toLowerCase() && r.participantKey !== participantKey
      );
      if (conflict) {
        return NextResponse.json({ registered: false, isOwner: false, conflict: true });
      }
    }
  }

  return NextResponse.json({ registered: false, isOwner: false, conflict: false });
}
