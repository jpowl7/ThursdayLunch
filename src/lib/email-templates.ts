import { APP_URL } from "./email";

/**
 * Plain-text emails sent to a group's recovery address. Keep them short and never
 * include the passcode itself: it's stored hashed and the admin already chose it.
 */

interface GroupRef {
  slug: string;
  name: string;
}

export function welcomeEmail(group: GroupRef): { subject: string; text: string } {
  return {
    subject: `Welcome to ilikelunch: ${group.name}`,
    text: [
      `Your group "${group.name}" is ready.`,
      ``,
      `Share this link with the group:`,
      `  ${APP_URL}/g/${group.slug}`,
      ``,
      `Manage events here (needs the 4-digit admin passcode you just chose):`,
      `  ${APP_URL}/g/${group.slug}/admin`,
      ``,
      `This address is the recovery contact for the admin passcode. If it's ever forgotten,`,
      `use "Forgot the passcode?" on the admin page and a reset link will be sent here.`,
      ``,
      `Tips: set a recurring schedule and a voting deadline on the admin page so lunches`,
      `create and finalize themselves each week.`,
    ].join("\n"),
  };
}

export function passcodeChangedEmail(group: GroupRef): { subject: string; text: string } {
  return {
    subject: `ilikelunch: admin passcode changed for ${group.name}`,
    text: [
      `The admin passcode for "${group.name}" was just changed.`,
      ``,
      `If you did this, no action is needed.`,
      `If you didn't, someone else has your old passcode. Use "Forgot the passcode?" on the`,
      `admin page to set a new one right away:`,
      `  ${APP_URL}/g/${group.slug}/admin`,
    ].join("\n"),
  };
}

export function recoveryEmailChangedEmail(
  group: GroupRef,
  change: { oldEmail: string | null; newEmail: string | null }
): { subject: string; text: string } {
  const what = change.newEmail
    ? `is now ${change.newEmail}`
    : `was removed, so passcode recovery is no longer possible for this group`;
  return {
    subject: `ilikelunch: recovery email updated for ${group.name}`,
    text: [
      `The passcode recovery email for "${group.name}" ${what}.`,
      ``,
      `If you didn't make this change, sign in to the admin page and fix it:`,
      `  ${APP_URL}/g/${group.slug}/admin`,
    ].join("\n"),
  };
}
