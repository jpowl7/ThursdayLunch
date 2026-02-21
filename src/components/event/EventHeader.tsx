import type { Event } from "@/lib/schemas";

interface EventHeaderProps {
  event: Event;
}

function formatEventDate(dateStr: string): string {
  // Handle both "YYYY-MM-DD" and verbose Date.toString() formats
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function EventHeader({ event }: EventHeaderProps) {
  const isOpen = event.status === "open";
  const isFinalized = event.status === "finalized";

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-orange-500 font-bold text-sm tracking-wider uppercase">
          Coming up
        </span>
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
          <span className={`text-xs font-bold uppercase tracking-tight ${
            isOpen
              ? "text-orange-500"
              : isFinalized
                ? "text-green-600"
                : "text-gray-500"
          }`}>
            {isOpen ? "Open" : isFinalized ? "Finalized" : "Cancelled"}
          </span>
        </div>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {event.title}
      </h1>
      <p className="text-slate-500 text-sm font-medium mt-1">
        {formatEventDate(event.date)}
      </p>
    </div>
  );
}
