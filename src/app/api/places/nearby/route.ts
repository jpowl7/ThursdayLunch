import { NextRequest, NextResponse } from "next/server";
import { searchNearbyRestaurants } from "@/lib/google-places";
import { getGroupLocation } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const groupSlug = request.nextUrl.searchParams.get("groupSlug");
  const locationOverride = groupSlug ? await getGroupLocation(groupSlug) : null;

  const results = await searchNearbyRestaurants(locationOverride);
  return NextResponse.json(results);
}
