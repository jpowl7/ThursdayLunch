import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EventSnapshot } from "@/types";

interface SummaryPanelProps {
  snapshot: EventSnapshot;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function SummaryPanel({ snapshot }: SummaryPanelProps) {
  const { event, responses, locations } = snapshot;
  const inResponses = responses.filter((r) => r.isIn);

  // Vote tally
  const voteCounts = new Map<string, number>();
  for (const r of inResponses) {
    for (const locId of r.locationVotes) {
      voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
    }
  }

  const sortedLocations = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  );

  // Time overlap
  const timeSlots: { time: string; count: number }[] = [];
  if (inResponses.length > 0) {
    const earliest = event.earliestTime;
    const latest = event.latestTime;
    const [eh, em] = earliest.split(":").map(Number);
    const [lh, lm] = latest.split(":").map(Number);
    const startMin = eh * 60 + em;
    const endMin = lh * 60 + lm;
    for (let m = startMin; m <= endMin; m += 15) {
      const timeStr = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
      let count = 0;
      for (const r of inResponses) {
        if (r.availableFrom && r.availableTo) {
          const [fh, fm2] = r.availableFrom.split(":").map(Number);
          const [th, tm2] = r.availableTo.split(":").map(Number);
          const from = fh * 60 + fm2;
          const to = th * 60 + tm2;
          if (m >= from && m <= to) count++;
        }
      }
      timeSlots.push({ time: timeStr, count });
    }
  }

  const maxCount = Math.max(...timeSlots.map((s) => s.count), 1);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Headcount</h3>
          <p className="text-3xl font-bold text-green-600">{inResponses.length}</p>
          <p className="text-sm text-muted-foreground">
            {responses.length} total responses
          </p>
        </div>

        {timeSlots.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Time Overlap</h3>
            <div className="flex items-end gap-1 h-24">
              {timeSlots.map((slot) => (
                <div key={slot.time} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-orange-400 rounded-t min-h-[2px]"
                    style={{ height: `${(slot.count / maxCount) * 100}%` }}
                    title={`${formatTime(slot.time)}: ${slot.count} available`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(event.earliestTime)}</span>
              <span>{formatTime(event.latestTime)}</span>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-lg mb-2">Location Votes</h3>
          <div className="space-y-2">
            {sortedLocations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between">
                <span>{loc.name}</span>
                <Badge variant="secondary">{voteCounts.get(loc.id) || 0}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
