import { NextRequest, NextResponse } from "next/server";
import { verifyGroupPasscode, updateGroupLocation, getGroupBySlug } from "@/lib/db/queries";
import { z } from "zod";

const updateSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  name: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Auth check
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const group = await getGroupBySlug(slug);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  // Allow open groups (empty passcode) or valid passcode
  if (group.passcode && (!token || !(await verifyGroupPasscode(slug, token)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location data" }, { status: 400 });
  }

  const updated = await updateGroupLocation(slug, parsed.data.lat, parsed.data.lng, parsed.data.name);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({
    locationLat: updated.locationLat,
    locationLng: updated.locationLng,
    locationName: updated.locationName,
  });
}
