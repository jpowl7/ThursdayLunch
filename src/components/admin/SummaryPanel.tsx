import type { EventSnapshot } from "@/types";

interface SummaryPanelProps {
  snapshot: EventSnapshot;
  showTimeDistribution?: boolean;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function SummaryPanel({ snapshot, showTimeDistribution = true }: SummaryPanelProps) {
  const { event, responses, locations } = snapshot;
  const inResponses = responses.filter((r) => r.isIn);

  // Vote and preference tally
  const voteCounts = new Map<string, number>();
  const prefCounts = new Map<string, number>();
  for (const r of inResponses) {
    for (const locId of r.locationVotes) {
      voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
    }
    if (r.preferredLocationId) {
      prefCounts.set(r.preferredLocationId, (prefCounts.get(r.preferredLocationId) || 0) + 1);
    }
  }

  const sortedLocations = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  );

  const topLocation = sortedLocations[0];
  const topVotes = topLocation ? voteCounts.get(topLocation.id) || 0 : 0;

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

  // Find peak overlap time range
  const maxOverlap = Math.max(...timeSlots.map((s) => s.count), 0);
  const peakSlots = timeSlots.filter((s) => s.count === maxOverlap && maxOverlap > 0);
  const peakStart = peakSlots.length > 0 ? peakSlots[0].time : null;
  const peakEnd = peakSlots.length > 0 ? peakSlots[peakSlots.length - 1].time : null;

  const maxCount = Math.max(...timeSlots.map((s) => s.count), 1);

  return (
    <div className="bg-white rounded-xl p-4 border border-orange-500/10 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-500">Response Stats</h3>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
          <span className="text-2xl font-bold text-green-600">{inResponses.length}</span>
          <span className="text-sm text-green-600 font-medium">Going</span>
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-red-400 text-[20px]">cancel</span>
          <span className="text-2xl font-bold text-red-400">{responses.length - inResponses.length}</span>
          <span className="text-sm text-red-400 font-medium">Out</span>
        </div>
      </div>

      {peakStart && peakEnd && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <span className="material-symbols-outlined text-sm">schedule</span>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Peak Overlap</p>
            <p className="font-bold">{formatTime(peakStart)} — {formatTime(peakEnd)}</p>
          </div>
        </div>
      )}

      {topLocation && topVotes > 0 && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <span className="material-symbols-outlined text-sm">restaurant</span>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Most Voted</p>
            <p className="font-bold">
              {topLocation.name}
              <span className="text-orange-500 font-medium text-sm ml-1">
                ({topVotes} {topVotes === 1 ? "vote" : "votes"})
              </span>
            </p>
          </div>
        </div>
      )}

      {(() => {
        const topStarred = [...locations]
          .filter((l) => (prefCounts.get(l.id) || 0) > 0)
          .sort((a, b) => (prefCounts.get(b.id) || 0) - (prefCounts.get(a.id) || 0));
        const starLead = topStarred[0];
        const starCount = starLead ? prefCounts.get(starLead.id) || 0 : 0;
        if (!starLead) return null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <span className="material-symbols-outlined text-sm">star</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Most Starred</p>
              <p className="font-bold">
                {starLead.name}
                <span className="text-yellow-600 font-medium text-sm ml-1">
                  ({starCount} {starCount === 1 ? "star" : "stars"})
                </span>
              </p>
            </div>
          </div>
        );
      })()}

      {showTimeDistribution && timeSlots.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-2">Time Distribution</p>
          <div className="flex items-end gap-1 h-16">
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
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{formatTime(event.earliestTime)}</span>
            <span>{formatTime(event.latestTime)}</span>
          </div>
        </div>
      )}

      {sortedLocations.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-2">All Venues</p>
          <div className="space-y-2">
            {sortedLocations.map((loc) => {
              const count = voteCounts.get(loc.id) || 0;
              const prefs = prefCounts.get(loc.id) || 0;
              const pct = inResponses.length > 0 ? (count / inResponses.length) * 100 : 0;
              return (
                <div key={loc.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{loc.name}</span>
                      <span className="text-slate-400 text-xs">
                        {count}{prefs > 0 && ` · ${prefs} ★`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
