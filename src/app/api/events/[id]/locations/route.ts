import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { AddLocationSchema, MAX_LOCATIONS_PER_EVENT } from "@/lib/schemas";
import { addLocation, getEventById, getEventSnapshot, getGroupByEventId, isKnownParticipant } from "@/lib/db/queries";
import { getPlaceDetails, lookupPlace } from "@/lib/google-places";

export async function POST(
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

    const body = await readJsonBody(request);
    const parsed = AddLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    // Only people who are actually part of this group can add restaurants
    // (each add costs a Google Places call).
    const group = await getGroupByEventId(id);
    if (!group || !(await isKnownParticipant(parsed.data.addedBy, group.id))) {
      return NextResponse.json({ error: "RSVP first to suggest a restaurant" }, { status: 403 });
    }

    // Check for duplicate name (case-insensitive)
    const snapshot = await getEventSnapshot(id);
    const existing = snapshot?.locations ?? [];
    if (existing.length >= MAX_LOCATIONS_PER_EVENT) {
      return NextResponse.json({ error: "This event already has the maximum number of restaurants" }, { status: 400 });
    }
    const isDuplicate = existing.some(
      (loc) => loc.name.toLowerCase() === parsed.data.name.toLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json({ error: "A location with that name already exists" }, { status: 409 });
    }

    // Resolve address + maps URL + website. A quick-add chip already carries these from
    // the last time the place was used, so it costs no Google call at all.
    let placeInfo: { address: string; mapsUrl: string; websiteUrl?: string | null } | null = null;
    if (parsed.data.placeId) {
      placeInfo = await getPlaceDetails(parsed.data.placeId, parsed.data.sessionToken);
    } else if (parsed.data.address || parsed.data.mapsUrl) {
      placeInfo = {
        address: parsed.data.address ?? "",
        mapsUrl: parsed.data.mapsUrl ?? "",
        websiteUrl: parsed.data.websiteUrl ?? null,
      };
    } else {
      placeInfo = await lookupPlace(parsed.data.name);
    }

    const location = await addLocation(id, parsed.data.name, {
      address: placeInfo?.address,
      mapsUrl: placeInfo?.mapsUrl,
      websiteUrl: placeInfo?.websiteUrl ?? undefined,
      addedBy: parsed.data.addedBy,
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Error adding location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
