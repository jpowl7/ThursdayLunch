"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationPromptProps {
  participantKey: string | null;
  groupSlug: string;
  hasRsvped: boolean;
}

const DISMISS_KEY = "push-prompt-dismissed";
const IOS_HINT_DISMISS_KEY = "ios-homescreen-hint-dismissed";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/(CriOS|FxiOS|OPiOS)/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export function NotificationPrompt({ participantKey, groupSlug, hasRsvped }: NotificationPromptProps) {
  const { supported, permission, subscribed, loading, subscribe } = useNotifications(participantKey, groupSlug);
  const [dismissed, setDismissed] = useState(true);
  const [iosHintDismissed, setIosHintDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISS_KEY));
    setIosHintDismissed(!!localStorage.getItem(IOS_HINT_DISMISS_KEY));
  }, []);

  if (loading || !hasRsvped) return null;

  // iOS Safari (not standalone) — show "add to home screen" hint
  if (!supported && isIosSafari() && !isStandalone() && !iosHintDismissed) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-[24px] mt-0.5">phone_iphone</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Get push notifications</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Tap the share button <span className="inline-block align-middle text-blue-500 text-[14px] material-symbols-outlined">ios_share</span> then
            &ldquo;Add to Home Screen&rdquo; to enable notifications on iPhone.
          </p>
          <button
            onClick={() => {
              localStorage.setItem(IOS_HINT_DISMISS_KEY, "1");
              setIosHintDismissed(true);
            }}
            className="mt-2 px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (!supported || subscribed || dismissed) return null;
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
