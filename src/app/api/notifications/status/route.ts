import { NextRequest, NextResponse } from "next/server";
import { getGroupBySlug, isPushSubscribed } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupSlug = searchParams.get("group");
    const participantKey = searchParams.get("participantKey");

    if (!groupSlug || !participantKey) {
      return NextResponse.json({ error: "Missing group or participantKey" }, { status: 400 });
    }

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const subscribed = await isPushSubscribed(participantKey, group.id);
    return NextResponse.json({ subscribed });
  } catch (error) {
    console.error("Error checking push status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
