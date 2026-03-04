"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPromptProps {
  participantKey: string | null;
  groupSlug: string;
  hasRsvped: boolean;
}

const DISMISS_KEY = "push-prompt-dismissed";

export function NotificationPrompt({ participantKey, groupSlug, hasRsvped }: NotificationPromptProps) {
  const { supported, permission, subscribed, loading, subscribe } = useNotifications(participantKey, groupSlug);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISS_KEY));
  }, []);

  if (!supported || loading || subscribed || dismissed || !hasRsvped) return null;
  if (permission === "denied") return null;

  const handleEnable = async () => {
    await subscribe();
    setDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
      <span className="material-symbols-outlined text-orange-500 text-[24px] mt-0.5">notifications_active</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">Stay in the loop?</p>
        <p className="text-xs text-slate-500 mt-0.5">Get notified when plans change.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleEnable}
            className="px-3 py-1 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
