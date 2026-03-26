import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEventById, getGroupByEventId, updateVotingDeadline } from "@/lib/db/queries";

const UpdateDeadlineSchema = z.object({
  votingDeadline: z.string().nullable(),
});

export async function PATCH(
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
    if (!event || event.status !== "open") {
      return NextResponse.json({ error: "Event not found or not open" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updated = await updateVotingDeadline(id, parsed.data.votingDeadline);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating voting deadline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
