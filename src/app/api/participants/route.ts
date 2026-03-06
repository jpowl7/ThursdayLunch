import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createParticipant, updateParticipantPin, getParticipantByKey } from "@/lib/db/queries";

const RegisterSchema = z.object({
  name: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  participantKey: z.string().min(1).optional(),
});

const ChangePinSchema = z.object({
  participantKey: z.string().min(1),
  currentPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const key = parsed.data.participantKey ?? crypto.randomUUID();
    const participant = await createParticipant(parsed.data.name, parsed.data.pin, key);
    return NextResponse.json({ participantKey: participant.participantKey, name: participant.name }, { status: 201 });
  } catch (error) {
    // Unique constraint violation = name+pin combo already taken
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json({ error: "That name and PIN combination is already registered. Use login instead." }, { status: 409 });
    }
    console.error("Error registering participant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChangePinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const { participantKey, currentPin, newPin } = parsed.data;

    // Check if participant has a registered account
    const participant = await getParticipantByKey(participantKey);
    if (!participant) {
      return NextResponse.json({ error: "No registered account found" }, { status: 404 });
    }

    const updated = await updateParticipantPin(participantKey, currentPin, newPin);
    if (!updated) {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing PIN:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
