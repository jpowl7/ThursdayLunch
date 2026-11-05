import { NextRequest, NextResponse } from "next/server";
import { checkGroupAdmin } from "@/lib/auth";
import { DeleteLocationSchema, RenameLocationSchema } from "@/lib/schemas";
import { deleteLocation, adminDeleteLocation, updateLocationName, getEventById, getGroupByEventId } from "@/lib/db/queries";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId } = await params;
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "open") {
      return NextResponse.json({ error: "Event is not open" }, { status: 400 });
    }

    // Admin delete (Bearer token) — can delete any location
    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (passcode) {
      const group = await getGroupByEventId(id);
      const denied = group ? await checkGroupAdmin(request, group) : null;
      if (denied?.status === 429) return denied;
      if (group && !denied) {
        const deleted = await adminDeleteLocation(id, locationId);
        if (!deleted) {
          return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
      }
    }

    // Participant delete — can only delete own locations
    const body = await request.json();
    const parsed = DeleteLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const deleted = await deleteLocation(locationId, parsed.data.participantKey);
    if (!deleted) {
      return NextResponse.json({ error: "Location not found or not yours to delete" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

    const body = await request.json();
    const parsed = RenameLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updated = await updateLocationName(id, locationId, parsed.data.name);
    if (!updated) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error renaming location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
