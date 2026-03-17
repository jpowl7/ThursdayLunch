"use client";

import { useState, useEffect, useCallback } from "react";
import type { Location, Response } from "@/lib/schemas";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { toast } from "sonner";

interface PastLocation {
  name: string;
  address: string | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
  useCount: number;
}

interface VetoInfo {
  name: string;
  reason: string;
}

interface LocationVotingProps {
  locations: Location[];
  responses: Response[];
  selectedIds: string[];
  onVote: (locationIds: string[]) => void;
  preferredLocationId?: string | null;
  onPreference?: (locationId: string | null) => void;
  vetoLocationId?: string | null;
  vetoReason?: string | null;
  onVeto?: (locationId: string, reason: string) => void;
  onClearVeto?: () => void;
  disabled?: boolean;
  eventId?: string;
  participantKey?: string;
  onLocationAdded?: () => void;
  groupSlug?: string;
}

export function LocationVoting({
  locations,
  responses,
  selectedIds,
  onVote,
  preferredLocationId,
  onPreference,
  vetoLocationId,
  onVeto,
  onClearVeto,
  disabled,
  eventId,
  participantKey,
  onLocationAdded,
  groupSlug,
}: LocationVotingProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [pastLocations, setPastLocations] = useState<PastLocation[]>([]);
  const [addingChip, setAddingChip] = useState<string | null>(null);
  const [vetoingLocationId, setVetoingLocationId] = useState<string | null>(null);
  const [vetoReasonInput, setVetoReasonInput] = useState("");

  const fetchPastLocations = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/past-locations`);
      if (res.ok) {
        const data: PastLocation[] = await res.json();
        setPastLocations(data);
      }
    } catch {
      // ignore
    }
  }, [eventId]);

  useEffect(() => {
    fetchPastLocations();
  }, [fetchPastLocations]);

  // Filter out locations already on the current event
  const availableChips = pastLocations.filter(
    (pl) => !locations.some((loc) => loc.name.toLowerCase() === pl.name.toLowerCase())
  );

  // Duplicate check
  const isDuplicate = newName.trim().length > 0 && locations.some(
    (loc) => loc.name.toLowerCase() === newName.trim().toLowerCase()
  );

  // Count votes and preferences per location
  const voteCounts = new Map<string, number>();
  const prefCounts = new Map<string, number>();
  for (const r of responses) {
    if (r.status === "in") {
      for (const locId of r.locationVotes) {
        voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
      }
      if (r.preferredLocationId) {
        prefCounts.set(r.preferredLocationId, (prefCounts.get(r.preferredLocationId) || 0) + 1);
      }
    }
  }

  // Build vetoed locations map from all "in" responses
  const vetoedLocations = new Map<string, VetoInfo[]>();
  for (const r of responses) {
    if (r.status === "in" && r.vetoLocationId && r.vetoReason) {
      const existing = vetoedLocations.get(r.vetoLocationId) || [];
      existing.push({ name: r.name, reason: r.vetoReason });
      vetoedLocations.set(r.vetoLocationId, existing);
    }
  }

  const toggleLocation = (id: string) => {
    if (disabled || vetoedLocations.has(id)) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id];
    onVote(next);
  };

  const sorted = [...locations].sort((a, b) => {
    // Vetoed locations go to bottom
    const aVetoed = vetoedLocations.has(a.id) ? 1 : 0;
    const bVetoed = vetoedLocations.has(b.id) ? 1 : 0;
    if (aVetoed !== bVetoed) return aVetoed - bVetoed;
    return (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0);
  });

  const handlePlaceChange = (name: string, placeId: string | null) => {
    setNewName(name);
    setSelectedPlaceId(placeId);
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
        const added = await res.json();
        setNewName("");
        setSelectedPlaceId(null);
        if (added?.id) {
          setRecentlyAdded((prev) => new Set(prev).add(added.id));
          setTimeout(() => {
            setRecentlyAdded((prev) => {
              const next = new Set(prev);
              next.delete(added.id);
              return next;
            });
          }, 15000);
        }
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

  const handleQuickAdd = async (pl: PastLocation) => {
    if (!eventId || addingChip) return;
    setAddingChip(pl.name);
    try {
      const res = await fetch(`/api/events/${eventId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pl.name,
          addedBy: participantKey || undefined,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        if (added?.id) {
          setRecentlyAdded((prev) => new Set(prev).add(added.id));
          setTimeout(() => {
            setRecentlyAdded((prev) => {
              const next = new Set(prev);
              next.delete(added.id);
              return next;
            });
          }, 15000);
        }
        onLocationAdded?.();
        fetchPastLocations();
      } else if (res.status === 409) {
        toast.error("Already on the list");
        fetchPastLocations();
      }
    } catch {
      // ignore
    } finally {
      setAddingChip(null);
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
          Where?
        </h3>
        <span className="text-[11px] text-slate-400 flex items-center gap-2">
          <span className="flex items-center gap-0.5"><span className="material-symbols-outlined filled text-[12px] text-orange-400">thumb_up</span> I&apos;d eat here</span>
          <span className="flex items-center gap-0.5"><span className="material-symbols-outlined filled text-[12px] text-yellow-500">star</span> my preference</span>
        </span>
      </div>
      <div className="space-y-2">
        {(showAll || sorted.length <= 10 ? sorted : sorted.slice(0, 10)).map((loc) => {
          const isEliminated = vetoedLocations.has(loc.id);
          const vetoes = vetoedLocations.get(loc.id) || [];
          const isMyVeto = vetoLocationId === loc.id;
          const isSelected = !isEliminated && selectedIds.includes(loc.id);
          const isPreferred = preferredLocationId === loc.id;
          const count = voteCounts.get(loc.id) || 0;
          const prefs = prefCounts.get(loc.id) || 0;
          const canDelete = loc.addedBy === participantKey && recentlyAdded.has(loc.id);
          return (
            <div key={loc.id}>
              <div
                onClick={() => !isEliminated && toggleLocation(loc.id)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isEliminated
                    ? "bg-slate-50 border border-slate-100 opacity-60 cursor-default"
                    : isSelected
                      ? "bg-white border-2 border-orange-500 shadow-sm shadow-orange-500/10 cursor-pointer"
                      : `bg-white border border-slate-100 shadow-sm ${disabled ? "opacity-60 cursor-default" : "hover:border-orange-500/50 cursor-pointer"}`
                }`}
              >
                {/* Check / empty circle / veto icon */}
                {isEliminated ? (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-red-100 text-red-500" title={vetoes.map((v) => `${v.name}: ${v.reason}`).join("\n")}>
                    <span className="material-symbols-outlined text-[16px]">block</span>
                  </div>
                ) : (
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-orange-500 text-white" : "border-2 border-slate-200"
                  }`}>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    )}
                  </div>
                )}

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
                        className={`flex-shrink-0 rounded-sm ${isEliminated ? "grayscale" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    );
                  } catch {
                    return null;
                  }
                })()}

                {/* Name + address */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-tight truncate ${isEliminated ? "line-through text-slate-400" : ""}`}>{loc.name}</p>
                  {isEliminated && (
                    <p className="text-[11px] text-red-400 leading-tight truncate">
                      {vetoes.map((v) => `${v.name}: ${v.reason}`).join(" · ")}
                    </p>
                  )}
                  {!isEliminated && loc.address && (
                    loc.mapsUrl ? (
                      <a
                        href={loc.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-500 hover:underline leading-tight truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {loc.address}
                      </a>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-tight truncate">{loc.address}</p>
                    )
                  )}
                </div>

                {/* Vote count + prefs (hidden when eliminated) */}
                {!isEliminated && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`material-symbols-outlined text-[14px] ${isSelected ? "filled text-orange-500" : "text-slate-300"}`}>
                      thumb_up
                    </span>
                    <span className="text-xs font-bold text-slate-500">{count}</span>
                    {prefs > 0 && (
                      <>
                        <span className="material-symbols-outlined text-[12px] text-slate-300">star</span>
                        <span className="text-xs font-bold text-slate-500">{prefs}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Veto count badge for eliminated locations */}
                {isEliminated && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-red-400">block</span>
                    <span className="text-xs font-bold text-red-400">{vetoes.length}</span>
                  </div>
                )}

                {/* Star button for preference */}
                {isSelected && onPreference && !isEliminated && (
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

                {/* Veto button (non-eliminated, status=in) */}
                {!isEliminated && !disabled && onVeto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVetoingLocationId(vetoingLocationId === loc.id ? null : loc.id);
                      setVetoReasonInput("");
                    }}
                    className="flex-shrink-0 p-0.5 rounded-full transition-all"
                    title="Veto this location"
                  >
                    <span className="material-symbols-outlined text-[14px] text-slate-300 hover:text-red-400">block</span>
                  </button>
                )}

                {/* Clear own veto */}
                {isMyVeto && onClearVeto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearVeto();
                    }}
                    className="flex-shrink-0 px-2 py-0.5 text-[11px] font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-full transition-all"
                    title="Remove your veto"
                  >
                    Undo
                  </button>
                )}

                {/* Delete button (only for locations you added) */}
                {canDelete && !disabled && !isEliminated && (
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

              {/* Inline veto reason input */}
              {vetoingLocationId === loc.id && (
                <div className="flex gap-2 mt-1 ml-9">
                  <input
                    type="text"
                    value={vetoReasonInput}
                    onChange={(e) => setVetoReasonInput(e.target.value)}
                    placeholder="Reason (e.g. ate here yesterday)"
                    className="flex-1 px-3 py-1.5 text-sm border border-red-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && vetoReasonInput.trim()) {
                        onVeto?.(loc.id, vetoReasonInput.trim());
                        setVetoingLocationId(null);
                        setVetoReasonInput("");
                      } else if (e.key === "Escape") {
                        setVetoingLocationId(null);
                        setVetoReasonInput("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (vetoReasonInput.trim()) {
                        onVeto?.(loc.id, vetoReasonInput.trim());
                        setVetoingLocationId(null);
                        setVetoReasonInput("");
                      }
                    }}
                    disabled={!vetoReasonInput.trim()}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Veto
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVetoingLocationId(null); setVetoReasonInput(""); }}
                    className="px-2 py-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
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

      {/* Prior added locations quick-pick */}
      {eventId && !disabled && availableChips.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">Prior added locations</p>
          <div className="flex flex-wrap gap-1.5">
            {availableChips.slice(0, 8).map((pl) => (
              <button
                key={pl.name}
                type="button"
                onClick={() => handleQuickAdd(pl)}
                disabled={addingChip !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
              >
                {addingChip === pl.name ? (
                  <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]">add</span>
                )}
                {pl.name}
                {pl.useCount > 1 && (
                  <span className="text-[10px] text-slate-400">{pl.useCount}x</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggest a place */}
      {eventId && !disabled && (
        <div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <PlacesAutocomplete
                value={newName}
                onChange={handlePlaceChange}
                placeholder="Suggest a place…"
                groupSlug={groupSlug}
                inputClassName={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 transition-colors ${
                  isDuplicate
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                    : "border-slate-200 focus:border-orange-400 focus:ring-orange-400"
                }`}
              />
            </div>
            <button
              type="button"
              onClick={handleAddLocation}
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
        </div>
      )}
    </div>
  );
}
