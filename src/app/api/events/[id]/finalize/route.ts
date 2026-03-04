import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { finalizeEvent, reopenEvent, getEventById, getGroupByEventId, getEventSnapshot } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";

const FinalizeSchema = z.object({
  chosenTime: z.string(),
  chosenLocationId: z.string().uuid(),
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
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = FinalizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updated = await finalizeEvent(id, parsed.data.chosenTime, parsed.data.chosenLocationId);

    after(async () => {
      const snapshot = await getEventSnapshot(id);
      const locationName = snapshot?.locations?.find((l) => l.id === parsed.data.chosenLocationId)?.name || "a restaurant";
      await sendPushToGroup(group.id, {
        title: "It's decided!",
        body: `We're eating at ${locationName} at ${parsed.data.chosenTime}.`,
        url: `/g/${group.slug}`,
        tag: `finalized-${id}`,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error finalizing event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const updated = await reopenEvent(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error reopening event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
