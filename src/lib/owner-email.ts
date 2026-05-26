import { Resend } from "resend";

export async function notifyOwner(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_EMAIL;
  const from = process.env.RESEND_FROM ?? "ilikelunch <onboarding@resend.dev>";

  if (!apiKey || !to) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, text: body });
  } catch (err) {
    console.error("notifyOwner failed:", err);
  }
}
