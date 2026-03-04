import webpush from "web-push";
import { getPushSubscriptionsForGroup, deletePushSubscription } from "@/lib/db/queries";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "https://ilikelunch.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToGroup(
  groupId: string,
  payload: PushPayload,
  excludeParticipantKey?: string
) {
  if (!ensureVapid()) {
    console.warn("VAPID keys not configured, skipping push");
    return;
  }

  const subscriptions = await getPushSubscriptionsForGroup(groupId, excludeParticipantKey);
  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await deletePushSubscription(sub.participantKey, sub.groupId, sub.endpoint);
        }
        throw err;
      }
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`Push: ${failed}/${subscriptions.length} failed`);
  }
}
