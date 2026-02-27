import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createParticipant } from "@/lib/db/queries";

const RegisterSchema = z.object({
  name: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  participantKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const participant = await createParticipant(parsed.data.name, parsed.data.pin, parsed.data.participantKey);
    return NextResponse.json({ participantKey: participant.participantKey }, { status: 201 });
  } catch (error) {
    // Unique constraint violation = name+pin combo already taken
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json({ error: "That name and PIN combination is already registered. Use login instead." }, { status: 409 });
    }
    console.error("Error registering participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
