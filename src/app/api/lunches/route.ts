import { NextRequest, NextResponse } from "next/server";
import { getPastLunches, getGroupBySlug } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const groupSlug = request.nextUrl.searchParams.get("group");
    if (!groupSlug) {
      return NextResponse.json({ error: "Missing group parameter" }, { status: 400 });
    }

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const lunches = await getPastLunches(group.id);
    return NextResponse.json(lunches);
  } catch (error) {
    console.error("Error fetching past lunches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
