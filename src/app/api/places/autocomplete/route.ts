import { NextRequest, NextResponse } from "next/server";
import { autocompletePlaces } from "@/lib/google-places";
import { getGroupLocation } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";
  if (input.length < 2) {
    return NextResponse.json([]);
  }

  const groupSlug = request.nextUrl.searchParams.get("groupSlug");
  const types = request.nextUrl.searchParams.get("types");
  const locationOverride = groupSlug ? await getGroupLocation(groupSlug) : null;

  const suggestions = await autocompletePlaces(input, locationOverride, types);
  return NextResponse.json(suggestions);
}
