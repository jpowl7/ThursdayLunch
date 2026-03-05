import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { UpsertResponseSchema } from "@/lib/schemas";
import { upsertResponse, getEventById, getGroupByEventId, hasConflictingResponse } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "open") {
      return NextResponse.json({ error: "Event is not open" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpsertResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { participantKey, ...input } = parsed.data;

    // Server-side duplicate name guard
    const conflict = await hasConflictingResponse(id, participantKey, input.name);
    if (conflict) {
      return NextResponse.json(
        { error: "This name is already in use for this event by another participant" },
        { status: 409 }
      );
    }

    const response = await upsertResponse(id, participantKey, input);

    if (input.status === "in") {
      after(async () => {
        const group = await getGroupByEventId(id);
        if (group) {
          await sendPushToGroup(group.id, {
            title: "New RSVP!",
            body: `${input.name} is in for Thursday!`,
            url: `/g/${group.slug}`,
            tag: `rsvp-${id}`,
          }, participantKey);
        }
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error upserting response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
