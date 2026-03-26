"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/lib/schemas";
import type { ReactNode } from "react";

interface EventHeaderProps {
  event: Event;
  shareButton?: ReactNode;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatCountdown(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "Closing soon…";
  const totalMin = Math.ceil(diff / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function EventHeader({ event, shareButton }: EventHeaderProps) {
  const isOpen = event.status === "open";
  const isFinalized = event.status === "finalized";
  const deadlineStr = event.votingDeadline;
  const deadline = deadlineStr ? new Date(deadlineStr) : null;
  const [countdown, setCountdown] = useState(deadline ? formatCountdown(deadline) : "");

  useEffect(() => {
    if (!deadlineStr || !isOpen) return;
    const d = new Date(deadlineStr);
    setCountdown(formatCountdown(d));
    const interval = setInterval(() => setCountdown(formatCountdown(d)), 30000);
    return () => clearInterval(interval);
  }, [deadlineStr, isOpen]);

  const statusText = isOpen
    ? `Voting open for ${formatDate(event.date)}`
    : isFinalized
      ? `Finalized for ${formatDate(event.date)}`
      : "Cancelled";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
          isOpen
            ? "bg-orange-500/10"
            : isFinalized
              ? "bg-green-500/10"
              : "bg-gray-500/10"
        }`}>
          {isOpen && (
            <span className="size-2 bg-orange-500 rounded-full animate-pulse" />
          )}
          <span className={`text-xs font-bold tracking-tight ${
            isOpen
              ? "text-orange-500"
              : isFinalized
                ? "text-green-600"
                : "text-gray-500"
          }`}>
            {statusText}
          </span>
        </div>
        {shareButton}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 break-words">
        {event.title}
      </h1>
      {isOpen && deadline && countdown && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="material-symbols-outlined text-amber-500 text-[16px]">timer</span>
          <span className="text-xs font-medium text-amber-600">
            Voting closes in {countdown}
          </span>
        </div>
      )}
    </div>
  );
}
