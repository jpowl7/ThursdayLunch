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

export function EventHeader({ event, shareButton }: EventHeaderProps) {
  const isOpen = event.status === "open";
  const isFinalized = event.status === "finalized";

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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {event.title}
      </h1>
    </div>
  );
}
