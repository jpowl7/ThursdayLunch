import { NextRequest, NextResponse } from "next/server";
import { AddLocationSchema } from "@/lib/schemas";
import { addLocation, getEventById, getEventSnapshot } from "@/lib/db/queries";
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

    const body = await request.json();
    const parsed = AddLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    // Check for duplicate name (case-insensitive)
    const snapshot = await getEventSnapshot(id);
    const existing = snapshot?.locations ?? [];
    const isDuplicate = existing.some(
      (loc) => loc.name.toLowerCase() === parsed.data.name.toLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json({ error: "A location with that name already exists" }, { status: 409 });
    }

    // Resolve address + maps URL + website
    let placeInfo: { address: string; mapsUrl: string; websiteUrl?: string | null } | null = null;
    if (parsed.data.placeId) {
      placeInfo = await getPlaceDetails(parsed.data.placeId);
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
