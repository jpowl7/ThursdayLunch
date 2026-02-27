import { NextRequest, NextResponse } from "next/server";
import { CreateEventSchema } from "@/lib/schemas";
import { createEvent, getGroupBySlug } from "@/lib/db/queries";
import { getPlaceDetails } from "@/lib/google-places";

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
    if (group.passcode !== "" && group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve place details for locations with placeId
    const resolvedLocations = await Promise.all(
      locations.map(async (loc) => {
        if (loc.placeId) {
          const details = await getPlaceDetails(loc.placeId);
          if (details) {
            return {
              name: loc.name,
              address: details.address,
              mapsUrl: details.mapsUrl,
              websiteUrl: details.websiteUrl ?? undefined,
            };
          }
        }
        return {
          name: loc.name,
          address: loc.address,
          mapsUrl: loc.mapsUrl,
        };
      })
    );

    const snapshot = await createEvent(eventInput, resolvedLocations, group.id);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
