import { NextRequest, NextResponse } from "next/server";
import { getCurrentEventSnapshot } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const groupSlug = request.nextUrl.searchParams.get("group");
    if (!groupSlug) {
      return NextResponse.json({ error: "Missing group parameter" }, { status: 400 });
    }

    // One database round-trip for group + current event + locations + responses.
    const { groupFound, snapshot } = await getCurrentEventSnapshot(groupSlug);
    if (!groupFound) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (!snapshot) {
      return NextResponse.json({ error: "No open event found" }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Error fetching current event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
