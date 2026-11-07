import { NextRequest, NextResponse } from "next/server";
import { checkGroupAdmin } from "@/lib/auth";
import { z } from "zod";
import { getEventById, getGroupByEventId, updateVotingDeadline } from "@/lib/db/queries";
import { invalidatePendingInstants } from "@/lib/cron-pending";

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

    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

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
    invalidatePendingInstants();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating voting deadline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
