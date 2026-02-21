import { Badge } from "@/components/ui/badge";
import type { Response, Location } from "@/lib/schemas";

interface AttendeeListProps {
  responses: Response[];
  locations: Location[];
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AttendeeList({ responses, locations }: AttendeeListProps) {
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));
  const inResponses = responses.filter((r) => r.isIn);
  const outResponses = responses.filter((r) => !r.isIn);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">
        Who&apos;s coming? ({inResponses.length})
      </h3>
      <div className="space-y-2">
        {inResponses.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
          >
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-800">
              {getInitials(r.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {r.availableFrom && r.availableTo && (
                  <Badge variant="outline" className="text-xs">
                    {formatTime(r.availableFrom)} - {formatTime(r.availableTo)}
                  </Badge>
                )}
                {r.locationVotes.map((locId) => (
                  <Badge key={locId} variant="secondary" className="text-xs">
                    {locationMap.get(locId) || "Unknown"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
        {outResponses.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mt-4">Not coming:</p>
            {outResponses.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 opacity-60"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                  {getInitials(r.name)}
                </div>
                <p className="font-medium text-gray-500">{r.name}</p>
              </div>
            ))}
          </>
        )}
        {responses.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No responses yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
