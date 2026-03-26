"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { EventSnapshot } from "@/types";

interface FinalizeControlsProps {
  snapshot: EventSnapshot;
  token: string;
  onFinalized: () => void;
  groupSlug: string;
}

export function FinalizeControls({ snapshot, token, onFinalized, groupSlug }: FinalizeControlsProps) {
  const { event, locations, responses } = snapshot;
  const inResponses = responses.filter((r) => r.status === "in");

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

  // Collect vetoed location IDs from "in" responses
  const vetoedLocationIds = new Set<string>();
  for (const r of inResponses) {
    if (r.vetoLocationId) vetoedLocationIds.add(r.vetoLocationId);
  }

  // Filter out vetoed locations
  const eligibleLocations = locations.filter((l) => !vetoedLocationIds.has(l.id));

  // Weighted scoring: thumbs up = 1pt, star = 2pts (1 bonus)
  const weightedScores = new Map<string, number>();
  for (const loc of eligibleLocations) {
    const votes = voteCounts.get(loc.id) || 0;
    const stars = prefCounts.get(loc.id) || 0;
    weightedScores.set(loc.id, votes + stars);
  }

  // Default to highest weighted eligible location
  const topLocationId = [...eligibleLocations].sort(
    (a, b) => (weightedScores.get(b.id) || 0) - (weightedScores.get(a.id) || 0)
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

  // Voting deadline state
  const existingDeadline = event.votingDeadline ? new Date(event.votingDeadline) : null;
  const existingDeadlineTime = existingDeadline
    ? existingDeadline.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Indiana/Indianapolis" })
    : "";
  const [deadlineTime, setDeadlineTime] = useState(existingDeadlineTime);
  const [savingDeadline, setSavingDeadline] = useState(false);

  const handleSetDeadline = async () => {
    setSavingDeadline(true);
    try {
      // Convert time to full ISO timestamp using event date + Eastern timezone
      let votingDeadline: string | null = null;
      if (deadlineTime) {
        const utcGuess = new Date(`${event.date}T${deadlineTime}:00Z`);
        const inEastern = new Date(utcGuess.toLocaleString("en-US", { timeZone: "America/Indiana/Indianapolis" }));
        const offsetMs = inEastern.getTime() - utcGuess.getTime();
        votingDeadline = new Date(utcGuess.getTime() - offsetMs).toISOString();
      }

      const res = await fetch(`/api/events/${event.id}/deadline`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ votingDeadline }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update deadline");
        return;
      }
      toast.success(votingDeadline ? "Voting deadline set!" : "Voting deadline cleared");
      onFinalized(); // refresh snapshot
    } catch {
      toast.error("Network error");
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleClearDeadline = async () => {
    setDeadlineTime("");
    setSavingDeadline(true);
    try {
      const res = await fetch(`/api/events/${event.id}/deadline`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ votingDeadline: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to clear deadline");
        return;
      }
      toast.success("Voting deadline cleared");
      onFinalized();
    } catch {
      toast.error("Network error");
    } finally {
      setSavingDeadline(false);
    }
  };

  const sortedLocations = [...eligibleLocations].sort(
    (a, b) => (weightedScores.get(b.id) || 0) - (weightedScores.get(a.id) || 0)
  );

  const inCount = responses.filter((r) => r.status === "in").length;
  const maybeCount = responses.filter((r) => r.status === "maybe").length;

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

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/g/${groupSlug}` : "";

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

      {/* Voting Deadline Section */}
      <div className="space-y-2 pt-2 border-t border-orange-500/10">
        <Label className="text-sm font-medium px-1 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          Auto-Finalize Deadline
        </Label>
        {existingDeadline ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              <span className="font-medium">Voting closes at </span>
              {existingDeadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Indiana/Indianapolis" })}
            </div>
            <button
              onClick={handleClearDeadline}
              disabled={savingDeadline}
              className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="flex-1 bg-white border border-orange-500/20 rounded-full px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm"
            />
            <button
              onClick={handleSetDeadline}
              disabled={savingDeadline || !deadlineTime}
              className="px-4 py-2 text-sm font-semibold rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {savingDeadline ? "..." : "Set"}
            </button>
          </div>
        )}
        <p className="text-[11px] text-slate-400 px-1">
          Top-voted venue + peak time will be auto-selected when the deadline passes
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleFinalize}
        disabled={submitting || !chosenLocationId}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 mt-4"
      >
        <span className="material-symbols-outlined">check_circle</span>
        {submitting ? "Finalizing..." : "Finalize Now"}
      </button>

      {inCount > 0 && (
        <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest">
          {inCount} going{maybeCount > 0 ? `, ${maybeCount} maybe` : ""}
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
