import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getParticipantByName } from "@/lib/db/queries";
import { verifyPinAttempt, recordUnknownLogin, LOCKOUT_MESSAGE } from "@/lib/auth";

const LoginSchema = z.object({
  name: z.string().trim().min(1).max(50),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const participant = await getParticipantByName(parsed.data.name);
    if (!participant) {
      await recordUnknownLogin(request);
      return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
    }

    const result = await verifyPinAttempt(request, participant, parsed.data.pin);
    if (result === "locked") {
      return NextResponse.json({ error: LOCKOUT_MESSAGE }, { status: 429 });
    }
    if (result === "wrong") {
      return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
    }

    return NextResponse.json({ participantKey: participant.participantKey, name: participant.name });
  } catch (error) {
    console.error("Error logging in participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
