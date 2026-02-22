"use client";

import { toast } from "sonner";
import type { Event } from "@/lib/schemas";

interface ShareButtonProps {
  event: Event;
}

export function ShareButton({ event }: ShareButtonProps) {
  const handleShare = async () => {
    const url = window.location.href;
    const text = `Join us for lunch! ${event.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text, url });
      } catch (err) {
        // User cancelled share — ignore AbortError
        if (err instanceof Error && err.name === "AbortError") return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      } catch {
        toast.error("Couldn't copy link");
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="mt-5 p-2 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
      aria-label="Share event"
    >
      <span className="material-symbols-outlined text-[22px]">share</span>
    </button>
  );
}
