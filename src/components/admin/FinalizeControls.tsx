"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import type { EventSnapshot } from "@/types";

interface FinalizeControlsProps {
  snapshot: EventSnapshot;
  token: string;
  onFinalized: () => void;
}

export function FinalizeControls({ snapshot, token, onFinalized }: FinalizeControlsProps) {
  const { event, locations, responses } = snapshot;
  const inResponses = responses.filter((r) => r.isIn);

  // Count votes and preferences for display in dropdown
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

  // Default to most-voted location
  const topLocationId = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  )[0]?.id || "";

  // Default to peak overlap start time
  const defaultTime = (() => {
    if (inResponses.length === 0) return event.earliestTime;
    const [eh, em] = event.earliestTime.split(":").map(Number);
    const [lh, lm] = event.latestTime.split(":").map(Number);
    const startMin = eh * 60 + em;
    const endMin = lh * 60 + lm;
    let maxCount = 0;
    let peakTime = event.earliestTime;
    for (let m = startMin; m <= endMin; m += 15) {
      let count = 0;
      for (const r of inResponses) {
        if (r.availableFrom && r.availableTo) {
          const [fh, fm2] = r.availableFrom.split(":").map(Number);
          const [th, tm2] = r.availableTo.split(":").map(Number);
          if (m >= fh * 60 + fm2 && m <= th * 60 + tm2) count++;
        }
      }
      if (count > maxCount) {
        maxCount = count;
        peakTime = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
      }
    }
    return peakTime;
  })();

  const [chosenTime, setChosenTime] = useState(defaultTime);
  const [chosenLocationId, setChosenLocationId] = useState(topLocationId);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const sortedLocations = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  );

  const inCount = responses.filter((r) => r.isIn).length;

  const handleFinalize = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${event.id}/finalize`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chosenTime, chosenLocationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to finalize");
        return;
      }
      onFinalized();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="bg-orange-500/5 rounded-xl p-6 border-2 border-dashed border-orange-500/20 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-500">Finalize Event</h3>

      <div className="space-y-2">
        <Label className="text-sm font-medium px-1">Select Venue</Label>
        <select
          value={chosenLocationId}
          onChange={(e) => setChosenLocationId(e.target.value)}
          className="w-full bg-white border border-orange-500/20 rounded-full px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none text-sm"
        >
          {sortedLocations.map((loc) => {
            const votes = voteCounts.get(loc.id) || 0;
            const prefs = prefCounts.get(loc.id) || 0;
            return (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({votes} votes{prefs > 0 ? `, ${prefs} ★` : ""})
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium px-1">Select Time</Label>
        <input
          type="time"
          value={chosenTime}
          onChange={(e) => setChosenTime(e.target.value)}
          className="w-full bg-white border border-orange-500/20 rounded-full px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleFinalize}
        disabled={submitting || !chosenLocationId}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 mt-4"
      >
        <span className="material-symbols-outlined">check_circle</span>
        {submitting ? "Finalizing..." : "Finalize Event"}
      </button>

      {inCount > 0 && (
        <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest">
          Sends notifications to {inCount} {inCount === 1 ? "person" : "people"}
        </p>
      )}

      <div className="pt-4 border-t border-orange-500/10">
        <Label className="text-sm font-medium px-1">Share Link</Label>
        <div className="flex gap-2 mt-2">
          <input
            value={shareUrl}
            readOnly
            className="flex-1 bg-white border border-orange-500/20 rounded-full px-4 py-2 text-sm text-slate-500"
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 border border-orange-500/20 rounded-full text-sm font-medium text-orange-500 hover:bg-orange-500/5 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
