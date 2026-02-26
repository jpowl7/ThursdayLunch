import { NextResponse } from "next/server";
import {
  getFinalizedEventCount,
  getLeaderboardAttendance,
  getLeaderboardTastemaker,
  getLeaderboardFirstResponder,
  getLeaderboardStreaks,
  getLeaderboardSpeedDemon,
  getLeaderboardFashionablyLate,
  getLeaderboardTrendsetter,
} from "@/lib/db/queries";

function mapEntries(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    participantKey: r.participant_key as string,
    name: r.name as string,
    count: r.count as number,
  }));
}

export async function GET() {
  try {
    const [totalEvents, attendance, tastemaker, firstResponder, streaks, speedDemon, fashionablyLate, trendsetter] =
      await Promise.all([
        getFinalizedEventCount(),
        getLeaderboardAttendance(),
        getLeaderboardTastemaker(),
        getLeaderboardFirstResponder(),
        getLeaderboardStreaks(),
        getLeaderboardSpeedDemon(),
        getLeaderboardFashionablyLate(),
        getLeaderboardTrendsetter(),
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
