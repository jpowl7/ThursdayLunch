"use client";

import { useState } from "react";
import type { Location, Response } from "@/lib/schemas";

interface LocationVotingProps {
  locations: Location[];
  responses: Response[];
  selectedIds: string[];
  onVote: (locationIds: string[]) => void;
  preferredLocationId?: string | null;
  onPreference?: (locationId: string | null) => void;
  disabled?: boolean;
  eventId?: string;
  onLocationAdded?: () => void;
}

export function LocationVoting({
  locations,
  responses,
  selectedIds,
  onVote,
  preferredLocationId,
  onPreference,
  disabled,
  eventId,
  onLocationAdded,
}: LocationVotingProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Count votes and preferences per location
  const voteCounts = new Map<string, number>();
  const prefCounts = new Map<string, number>();
  for (const r of responses) {
    if (r.isIn) {
      for (const locId of r.locationVotes) {
        voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
      }
      if (r.preferredLocationId) {
        prefCounts.set(r.preferredLocationId, (prefCounts.get(r.preferredLocationId) || 0) + 1);
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

  const handleAddLocation = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !eventId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setNewName("");
        onLocationAdded?.();
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">lunch_dining</span>
          Where to eat?
        </h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vote for your picks</span>
      </div>
      <div className="space-y-2">
        {sorted.map((loc) => {
          const isSelected = selectedIds.includes(loc.id);
          const isPreferred = preferredLocationId === loc.id;
          const count = voteCounts.get(loc.id) || 0;
          const prefs = prefCounts.get(loc.id) || 0;
          return (
            <div
              key={loc.id}
              onClick={() => toggleLocation(loc.id)}
              className={`relative flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-orange-500 shadow-sm shadow-orange-500/10"
                  : "border border-slate-100 shadow-sm hover:border-orange-500/50"
              } ${disabled ? "opacity-60 cursor-default" : ""}`}
            >
              {/* Check / empty circle */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                isSelected ? "bg-orange-500 text-white" : "border-2 border-slate-200"
              }`}>
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                )}
              </div>

              {/* Name + address */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{loc.name}</p>
                {loc.address && (
                  <p className="text-[11px] text-slate-400 leading-tight truncate">{loc.address}</p>
                )}
              </div>

              {/* Vote count + prefs */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`material-symbols-outlined text-[14px] ${isSelected ? "filled text-orange-500" : "text-slate-300"}`}>
                  thumb_up
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {count}
                  {prefs > 0 && <span className="text-yellow-500 ml-0.5">· {prefs} ★</span>}
                </span>
              </div>

              {/* Star button for preference */}
              {isSelected && onPreference && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreference(isPreferred ? null : loc.id);
                  }}
                  className="flex-shrink-0 p-0.5 rounded-full transition-all"
                  title={isPreferred ? "Remove top pick" : "Set as top pick"}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isPreferred ? "filled text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}>
                    star
                  </span>
                </button>
              )}

              {/* Map link */}
              {loc.mapsUrl && (
                <a
                  href={loc.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-[10px] text-blue-500 hover:underline uppercase tracking-wider font-bold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Map
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggest a place */}
      {eventId && !disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddLocation()}
            placeholder="Suggest a place…"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={handleAddLocation}
            disabled={adding || !newName.trim()}
            className="px-3 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-default transition-colors"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
