"use client";

import { useState, useEffect, useRef } from "react";
import type { Location, Response } from "@/lib/schemas";
import { toast } from "sonner";

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface LocationVotingProps {
  locations: Location[];
  responses: Response[];
  selectedIds: string[];
  onVote: (locationIds: string[]) => void;
  preferredLocationId?: string | null;
  onPreference?: (locationId: string | null) => void;
  disabled?: boolean;
  eventId?: string;
  participantKey?: string;
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
  participantKey,
  onLocationAdded,
}: LocationVotingProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Duplicate check
  const isDuplicate = newName.trim().length > 0 && locations.some(
    (loc) => loc.name.toLowerCase() === newName.trim().toLowerCase()
  );

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (newName.trim().length < 2 || selectedPlaceId) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(newName.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [newName, selectedPlaceId]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const selectSuggestion = (s: PlaceSuggestion) => {
    setNewName(s.mainText);
    setSelectedPlaceId(s.placeId);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setNewName(value);
    setSelectedPlaceId(null); // Clear selection when user edits
  };

  const handleAddLocation = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !eventId || isDuplicate) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          placeId: selectedPlaceId || undefined,
          addedBy: participantKey || undefined,
        }),
      });
      if (res.ok) {
        setNewName("");
        setSelectedPlaceId(null);
        setSuggestions([]);
        onLocationAdded?.();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          toast.error(data.error || "Already exists");
        }
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventId || !participantKey) return;
    try {
      const res = await fetch(`/api/events/${eventId}/locations/${locationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantKey }),
      });
      if (res.ok) {
        onLocationAdded?.(); // refresh
      } else {
        toast.error("Couldn't delete");
      }
    } catch {
      toast.error("Couldn't delete");
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
        {(showAll || sorted.length <= 10 ? sorted : sorted.slice(0, 10)).map((loc) => {
          const isSelected = selectedIds.includes(loc.id);
          const isPreferred = preferredLocationId === loc.id;
          const count = voteCounts.get(loc.id) || 0;
          const prefs = prefCounts.get(loc.id) || 0;
          const canDelete = loc.addedBy === participantKey;
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

              {/* Favicon */}
              {loc.websiteUrl && (() => {
                try {
                  const domain = new URL(loc.websiteUrl).hostname;
                  return (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                      alt=""
                      width={24}
                      height={24}
                      className="flex-shrink-0 rounded-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  );
                } catch {
                  return null;
                }
              })()}

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

              {/* Delete button (only for locations you added) */}
              {canDelete && !disabled && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(loc.id, e)}
                  className="flex-shrink-0 p-0.5 rounded-full transition-all"
                  title="Remove this location"
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-300 hover:text-red-500">
                    close
                  </span>
                </button>
              )}
            </div>
          );
        })}

        {/* Show more / less toggle */}
        {sorted.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-orange-500 transition-colors"
          >
            {showAll ? "Show less" : `Show ${sorted.length - 10} more`}
          </button>
        )}
      </div>

      {/* Suggest a place */}
      {eventId && !disabled && (
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowSuggestions(false);
                  handleAddLocation();
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Suggest a place…"
              className={`flex-1 min-w-0 px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 transition-colors ${
                isDuplicate
                  ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                  : "border-slate-200 focus:border-orange-400 focus:ring-orange-400"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                handleAddLocation();
              }}
              disabled={adding || !newName.trim() || isDuplicate}
              className="px-3 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-default transition-colors"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          {/* Duplicate warning */}
          {isDuplicate && (
            <p className="text-xs text-red-500 mt-1 ml-1">Already on the list</p>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-12 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden"
            >
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.mainText}</p>
                  <p className="text-xs text-slate-400 truncate">{s.secondaryText}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
