import { NextRequest, NextResponse } from "next/server";
import {
  getFinalizedEventCount,
  getLeaderboardAttendance,
  getLeaderboardTastemaker,
  getLeaderboardFirstResponder,
  getLeaderboardStreaks,
  getLeaderboardSpeedDemon,
  getLeaderboardFashionablyLate,
  getLeaderboardTrendsetter,
  getGroupBySlug,
} from "@/lib/db/queries";

function mapEntries(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    name: r.name as string,
    count: r.count as number,
  }));
}

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

    const [totalEvents, attendance, tastemaker, firstResponder, streaks, speedDemon, fashionablyLate, trendsetter] =
      await Promise.all([
        getFinalizedEventCount(group.id),
        getLeaderboardAttendance(group.id),
        getLeaderboardTastemaker(group.id),
        getLeaderboardFirstResponder(group.id),
        getLeaderboardStreaks(group.id),
        getLeaderboardSpeedDemon(group.id),
        getLeaderboardFashionablyLate(group.id),
        getLeaderboardTrendsetter(group.id),
      ]);

    return NextResponse.json({
      totalEvents,
      attendance: mapEntries(attendance as unknown as Record<string, unknown>[]),
      tastemaker: mapEntries(tastemaker as unknown as Record<string, unknown>[]),
      firstResponder: mapEntries(firstResponder as unknown as Record<string, unknown>[]),
      streaks: mapEntries(streaks as unknown as Record<string, unknown>[]),
      speedDemon: mapEntries(speedDemon as unknown as Record<string, unknown>[]),
      fashionablyLate: mapEntries(fashionablyLate as unknown as Record<string, unknown>[]),
      trendsetter: mapEntries(trendsetter as unknown as Record<string, unknown>[]),
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
