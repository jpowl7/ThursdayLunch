import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/schemas";

interface EventHeaderProps {
  event: Event;
}

export function EventHeader({ event }: EventHeaderProps) {
  const statusColor =
    event.status === "open"
      ? "bg-green-100 text-green-800"
      : event.status === "finalized"
        ? "bg-orange-100 text-orange-800"
        : "bg-gray-100 text-gray-800";

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground mt-1">
          {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <Badge className={statusColor} variant="secondary">
        {event.status === "open" ? "Open" : event.status === "finalized" ? "Finalized" : "Cancelled"}
      </Badge>
    </div>
  );
}
