import { NextRequest, NextResponse } from "next/server";
import { ToggleResponseSchema } from "@/lib/schemas";
import { deleteResponse, toggleResponseStatus, getEventById, getGroupByEventId } from "@/lib/db/queries";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const deleted = await deleteResponse(responseId);
    if (!deleted) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = ToggleResponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updated = await toggleResponseStatus(responseId, parsed.data.status);
    if (!updated) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
