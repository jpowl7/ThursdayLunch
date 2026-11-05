import { NextResponse } from "next/server";
import { hashCredential, verifyCredential } from "./credentials";
import {
  getAuthLockout,
  recordAuthFailure,
  setParticipantPin,
  updateGroupPasscode,
} from "./db/queries";

/**
 * Passcode / PIN verification with lockouts.
 *
 * Every failed guess is counted against the thing being guessed (a group's
 * passcode, a participant's PIN) AND against the caller's IP. Ten failures in
 * 15 minutes locks that key, so a 4-digit code can't be brute-forced.
 */

export const LOCKOUT_MESSAGE = "Too many wrong attempts. Try again in 15 minutes.";

export type AttemptResult = "ok" | "wrong" | "locked";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function attempt(
  keys: string[],
  plain: string,
  stored: string,
  upgrade: (hash: string) => Promise<unknown>
): Promise<AttemptResult> {
  if (await getAuthLockout(keys)) return "locked";
  const { ok, needsUpgrade } = await verifyCredential(plain, stored);
  if (!ok) {
    await recordAuthFailure(keys);
    return "wrong";
  }
  if (needsUpgrade) await upgrade(await hashCredential(plain));
  return "ok";
}

interface GroupLike {
  id: string;
  passcode: string;
}

/** Open groups (empty passcode) always pass. */
export async function verifyGroupPasscodeAttempt(
  request: Request,
  group: GroupLike,
  passcode: string
): Promise<AttemptResult> {
  if (group.passcode === "") return "ok";
  const keys = [`admin:${group.id}`, `admin-ip:${getClientIp(request)}`];
  return attempt(keys, passcode, group.passcode, (hash) => updateGroupPasscode(group.id, hash));
}

/**
 * Admin gate for routes that take the group passcode as a Bearer token.
 * Returns a ready-to-send error response, or null when the caller is allowed.
 */
export async function checkGroupAdmin(request: Request, group: GroupLike): Promise<NextResponse | null> {
  if (group.passcode === "") return null;
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await verifyGroupPasscodeAttempt(request, group, token);
  if (result === "locked") return NextResponse.json({ error: LOCKOUT_MESSAGE }, { status: 429 });
  if (result === "wrong") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

interface ParticipantLike {
  participantKey: string;
  pin: string;
}

export async function verifyPinAttempt(
  request: Request,
  participant: ParticipantLike,
  pin: string
): Promise<AttemptResult> {
  const keys = [`pin:${participant.participantKey}`, `login-ip:${getClientIp(request)}`];
  return attempt(keys, pin, participant.pin, (hash) => setParticipantPin(participant.participantKey, hash));
}

/** Count a login attempt for a name that doesn't exist against the caller's IP only. */
export async function recordUnknownLogin(request: Request): Promise<void> {
  await recordAuthFailure([`login-ip:${getClientIp(request)}`]);
}
