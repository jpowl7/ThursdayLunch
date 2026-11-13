import { Resend } from "resend";

export const APP_URL = "https://ilikelunch.com";

/**
 * Send a plain-text email through Resend. Never throws: email is a courtesy on top of
 * the real work, so a failure is logged and the request that triggered it still succeeds.
 * Silently does nothing when Resend isn't configured (local dev).
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "ilikelunch <onboarding@resend.dev>";
  if (!apiKey || !to) return false;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) {
      console.error("sendEmail failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}

/** "jpowell@example.com" → "jp***@example.com". For showing an address without revealing it. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const keep = local.length > 2 ? 2 : 1;
  return `${local.slice(0, keep)}***${domain}`;
}
