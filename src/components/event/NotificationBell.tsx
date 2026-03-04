"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface NotificationBellProps {
  participantKey: string | null;
  groupSlug: string;
}

export function NotificationBell({ participantKey, groupSlug }: NotificationBellProps) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = useNotifications(participantKey, groupSlug);

  if (!supported || loading) return null;

  // If permission was denied, don't show the bell
  if (permission === "denied") return null;

  const handleClick = async () => {
    if (subscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success("Notifications off");
      else toast.error("Couldn't turn off notifications");
    } else {
      const ok = await subscribe();
      if (ok) toast.success("Notifications on!");
      else if (Notification.permission === "denied") {
        toast.error("Notifications blocked — check browser settings");
      } else {
        toast.error("Couldn't enable notifications");
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
      aria-label={subscribed ? "Turn off notifications" : "Turn on notifications"}
    >
      <span
        className="material-symbols-outlined text-[22px]"
        style={{ fontVariationSettings: subscribed ? "'FILL' 1" : "'FILL' 0" }}
      >
        notifications
      </span>
    </button>
  );
}
