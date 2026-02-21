import { NextRequest, NextResponse } from "next/server";
import { UpsertResponseSchema } from "@/lib/schemas";
import { upsertResponse, getEventById } from "@/lib/db/queries";

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
    const response = await upsertResponse(id, participantKey, input);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error upserting response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
