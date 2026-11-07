import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { after } from "next/server";
import { UpsertResponseSchema } from "@/lib/schemas";
import { upsertResponse, getEventForResponse, getGroupByEventId } from "@/lib/db/queries";
import { sendPushToGroup } from "@/lib/push";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await readJsonBody(request);
    const parsed = UpsertResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { participantKey, ...input } = parsed.data;

    // Existence, open-ness and the duplicate-name guard in one query.
    const event = await getEventForResponse(id, participantKey, input.name);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "open") {
      return NextResponse.json({ error: "Event is not open" }, { status: 400 });
    }
    if (event.nameConflict) {
      return NextResponse.json(
        { error: "This name is already in use for this event by another participant" },
        { status: 409 }
      );
    }

    const response = await upsertResponse(id, participantKey, input);

    // Only send push when status actually changes (or first response)
    const previousStatus = response.previous_status ?? null;
    const statusChanged = previousStatus !== input.status;

    if (statusChanged) {
      const statusMessages: Record<string, string> = {
        in: `${input.name} is in!`,
        maybe: `${input.name} is a maybe`,
        out: `${input.name} is out`,
      };

      after(async () => {
        const group = await getGroupByEventId(id);
        if (group) {
          await sendPushToGroup(group.id, {
            title: "RSVP Update",
            body: statusMessages[input.status],
            url: `/g/${group.slug}`,
            tag: `rsvp-${id}-${participantKey}`,
          }, participantKey);
        }
      });
    }

    // Don't echo the raw DB row (it carries participant_key); the client only needs an ack.
    return NextResponse.json({ ok: true, id: response.id, status: input.status });
  } catch (error) {
    console.error("Error upserting response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
