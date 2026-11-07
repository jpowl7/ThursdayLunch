import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { updateGroupLocation, getGroupBySlug } from "@/lib/db/queries";
import { checkGroupAdmin } from "@/lib/auth";
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

  // Auth check (open groups with an empty passcode always pass)
  const group = await getGroupBySlug(slug);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  const denied = await checkGroupAdmin(request, group);
  if (denied) return denied;

  const body = await readJsonBody(request);
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
