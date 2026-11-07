import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { z } from "zod";
import { createParticipant, getParticipantByKey, getParticipantByName, setParticipantPin } from "@/lib/db/queries";
import { hashCredential } from "@/lib/credentials";
import { verifyPinAttempt, LOCKOUT_MESSAGE } from "@/lib/auth";

const RegisterSchema = z.object({
  name: z.string().min(1).max(50),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  participantKey: z.string().min(1).max(100).optional(),
});

const ChangePinSchema = z.object({
  participantKey: z.string().min(1).max(100),
  currentPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    // One account per name: a second "Alex" with a different PIN would make
    // login ambiguous, so send them to the login flow instead.
    const existing = await getParticipantByName(parsed.data.name);
    if (existing) {
      return NextResponse.json({ error: "That name is already registered. Use login instead." }, { status: 409 });
    }

    const key = parsed.data.participantKey ?? crypto.randomUUID();
    const participant = await createParticipant(parsed.data.name, await hashCredential(parsed.data.pin), key);
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
    const body = await readJsonBody(request);
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

    const result = await verifyPinAttempt(request, participant, currentPin);
    if (result === "locked") {
      return NextResponse.json({ error: LOCKOUT_MESSAGE }, { status: 429 });
    }
    if (result === "wrong") {
      return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
    }

    await setParticipantPin(participantKey, await hashCredential(newPin));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing PIN:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
