import { NextRequest, NextResponse } from "next/server";
import { searchNearbyRestaurants } from "@/lib/google-places";
import { getGroupLocation } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const groupSlug = request.nextUrl.searchParams.get("groupSlug");
  const locationOverride = groupSlug ? await getGroupLocation(groupSlug) : null;

  const results = await searchNearbyRestaurants(locationOverride);
  const response = NextResponse.json(results);
  // Restaurants near a fixed point don't change hour to hour. Let Vercel's CDN serve this
  // per group for a day so one Google Nearby call covers everyone's page loads.
  response.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
  return response;
}
