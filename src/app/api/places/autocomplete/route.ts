import { NextRequest, NextResponse } from "next/server";
import { autocompletePlaces } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";
  if (input.length < 2) {
    return NextResponse.json([]);
  }

  const suggestions = await autocompletePlaces(input);
  return NextResponse.json(suggestions);
}
