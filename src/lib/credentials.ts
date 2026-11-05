import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password-style hashing for the 4-digit group passcodes and participant PINs.
 *
 * Stored format: "scrypt$<salt base64url>$<hash base64url>".
 * Rows written before this existed hold the plain value; verifyCredential()
 * still accepts those and reports needsUpgrade so the caller can re-save a hash.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const PREFIX = "scrypt$";
const KEY_LENGTH = 32;

export function isHashedCredential(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export async function hashCredential(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, KEY_LENGTH);
  return `${PREFIX}${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyCredential(
  plain: string,
  stored: string
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  if (!isHashedCredential(stored)) {
    // Legacy plaintext row.
    const a = Buffer.from(plain);
    const b = Buffer.from(stored);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    return { ok, needsUpgrade: ok };
  }

  const [, saltB64, keyB64] = stored.split("$");
  if (!saltB64 || !keyB64) return { ok: false, needsUpgrade: false };
  const expected = Buffer.from(keyB64, "base64url");
  const actual = await scrypt(plain, Buffer.from(saltB64, "base64url"), expected.length);
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
  return { ok, needsUpgrade: false };
}
