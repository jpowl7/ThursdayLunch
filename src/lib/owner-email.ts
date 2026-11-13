import { sendEmail } from "./email";

/** Heads-up to the app owner (OWNER_EMAIL). Never throws. */
export async function notifyOwner(subject: string, body: string): Promise<void> {
  const to = process.env.OWNER_EMAIL;
  if (!to) return;
  await sendEmail(to, subject, body);
}
