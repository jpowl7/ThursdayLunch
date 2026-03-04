"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

export function useNotifications(participantKey: string | null, groupSlug: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const supported = isPushSupported();

  // Check current permission + server subscription status
  useEffect(() => {
    if (!supported || !participantKey) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    fetch(`/api/notifications/status?group=${encodeURIComponent(groupSlug)}&participantKey=${encodeURIComponent(participantKey)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setSubscribed(data.subscribed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [supported, participantKey, groupSlug]);

  const subscribe = useCallback(async () => {
    if (!supported || !participantKey || !VAPID_PUBLIC_KEY) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys) return false;

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantKey,
          groupSlug,
          subscription: {
            endpoint: json.endpoint,
            keys: {
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
          },
        }),
      });

      if (res.ok) {
        setSubscribed(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Push subscribe failed:", err);
      return false;
    }
  }, [supported, participantKey, groupSlug]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !participantKey) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantKey,
            groupSlug,
            endpoint,
          }),
        });
      }

      setSubscribed(false);
      return true;
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      return false;
    }
  }, [supported, participantKey, groupSlug]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
