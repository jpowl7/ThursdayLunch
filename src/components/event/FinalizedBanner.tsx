import { Card, CardContent } from "@/components/ui/card";
import type { Event, Location } from "@/lib/schemas";

interface FinalizedBannerProps {
  event: Event;
  locations: Location[];
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function FinalizedBanner({ event, locations }: FinalizedBannerProps) {
  const chosenLocation = locations.find((l) => l.id === event.chosenLocationId);

  return (
    <Card className="bg-orange-50 border-orange-200 mb-6">
      <CardContent className="p-6 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <h2 className="text-xl font-bold text-orange-800">Lunch is on!</h2>
        <p className="text-lg mt-2">
          <span className="font-semibold">{formatTime(event.chosenTime)}</span>
          {chosenLocation && (
            <>
              {" "}at{" "}
              {chosenLocation.mapsUrl ? (
                <a
                  href={chosenLocation.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {chosenLocation.name}
                </a>
              ) : (
                <span className="font-semibold">{chosenLocation.name}</span>
              )}
            </>
          )}
        </p>
        {chosenLocation?.address && (
          <p className="text-sm text-muted-foreground mt-1">{chosenLocation.address}</p>
        )}
      </CardContent>
    </Card>
  );
}
