import { NextRequest, NextResponse } from "next/server";
import { getCurrentEvent, getEventSnapshot } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const isDev = request.nextUrl.searchParams.get("dev") === "true";
    const event = await getCurrentEvent(isDev);
    if (!event) {
      return NextResponse.json({ error: "No open event found" }, { status: 404 });
    }

    const snapshot = await getEventSnapshot(event.id as string);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Error fetching current event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
