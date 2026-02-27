import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginParticipant } from "@/lib/db/queries";

const LoginSchema = z.object({
  name: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const participant = await loginParticipant(parsed.data.name, parsed.data.pin);
    if (!participant) {
      return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
    }

    return NextResponse.json({ participantKey: participant.participantKey });
  } catch (error) {
    console.error("Error logging in participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
