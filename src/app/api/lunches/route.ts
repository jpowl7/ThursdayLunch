import { NextResponse } from "next/server";
import { getPastLunches } from "@/lib/db/queries";

export async function GET() {
  try {
    const lunches = await getPastLunches();
    return NextResponse.json(lunches);
  } catch (error) {
    console.error("Error fetching past lunches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
