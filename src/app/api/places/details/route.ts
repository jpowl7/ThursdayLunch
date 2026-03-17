import { NextRequest, NextResponse } from "next/server";
import { getPlaceLocation } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  const location = await getPlaceLocation(placeId);
  if (!location) {
    return NextResponse.json({ error: "Could not resolve location" }, { status: 404 });
  }

  return NextResponse.json(location);
}
