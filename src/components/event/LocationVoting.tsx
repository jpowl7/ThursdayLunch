"use client";

import type { Location, Response } from "@/lib/schemas";

interface LocationVotingProps {
  locations: Location[];
  responses: Response[];
  selectedIds: string[];
  onVote: (locationIds: string[]) => void;
  disabled?: boolean;
}

// Assign a consistent color band and emoji to each card by index
const cardAccents = [
  { bg: "bg-orange-100", emoji: "🍕" },
  { bg: "bg-emerald-100", emoji: "🥗" },
  { bg: "bg-blue-100", emoji: "🍜" },
  { bg: "bg-purple-100", emoji: "🌮" },
  { bg: "bg-amber-100", emoji: "🍔" },
  { bg: "bg-rose-100", emoji: "🍣" },
  { bg: "bg-cyan-100", emoji: "🥡" },
  { bg: "bg-lime-100", emoji: "🥪" },
];

export function LocationVoting({
  locations,
  responses,
  selectedIds,
  onVote,
  disabled,
}: LocationVotingProps) {
  // Count votes per location
  const voteCounts = new Map<string, number>();
  for (const r of responses) {
    if (r.isIn) {
      for (const locId of r.locationVotes) {
        voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
      }
    }
  }

  const toggleLocation = (id: string) => {
    if (disabled) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id];
    onVote(next);
  };

  const sorted = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">lunch_dining</span>
          Where to eat?
        </h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vote for your picks</span>
      </div>
      <div className="grid gap-3 grid-cols-2">
        {sorted.map((loc, i) => {
          const isSelected = selectedIds.includes(loc.id);
          const count = voteCounts.get(loc.id) || 0;
          const accent = cardAccents[i % cardAccents.length];
          return (
            <div
              key={loc.id}
              onClick={() => toggleLocation(loc.id)}
              className={`relative group cursor-pointer bg-white rounded-xl overflow-hidden transition-all ${
                isSelected
                  ? "border-2 border-orange-500 shadow-md shadow-orange-500/10"
                  : "border border-slate-100 shadow-sm hover:border-orange-500/50 hover:shadow-md"
              } ${disabled ? "opacity-60 cursor-default" : ""}`}
            >
              {/* Colored header band with emoji */}
              <div className={`${accent.bg} h-20 flex items-center justify-center`}>
                <span className="text-4xl">{accent.emoji}</span>
              </div>
              <div className="p-3">
                <p className="font-bold text-sm mb-0.5">{loc.name}</p>
                {loc.address && (
                  <p className="text-[11px] text-slate-400 mb-2 leading-tight">{loc.address}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[14px] ${isSelected ? "filled text-orange-500" : "text-slate-400"}`}>
                      thumb_up
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? "text-slate-600" : "text-slate-400"}`}>
                      {count} {count === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  {loc.mapsUrl && (
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-500 hover:underline uppercase tracking-wider font-bold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Map
                    </a>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1 shadow-sm">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
