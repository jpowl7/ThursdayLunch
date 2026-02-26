import { NextResponse } from "next/server";
import { searchNearbyRestaurants } from "@/lib/google-places";

export async function GET() {
  const results = await searchNearbyRestaurants();
  return NextResponse.json(results);
}
