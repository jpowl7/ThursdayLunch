import { NextRequest, NextResponse } from "next/server";
import { CreateEventSchema } from "@/lib/schemas";
import { createEvent, getGroupBySlug } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { locations, groupSlug, ...eventInput } = parsed.data;

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await createEvent(eventInput, locations, group.id);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
