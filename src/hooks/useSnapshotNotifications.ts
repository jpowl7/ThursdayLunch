"use client";

import { useRef, useEffect } from "react";
import { toast } from "sonner";
import type { EventSnapshot } from "@/types";
import type { Response, Location } from "@/lib/schemas";

let badgeCount = 0;

function incrementBadge() {
  badgeCount++;
  try {
    navigator.setAppBadge(badgeCount);
  } catch {
    // Badge API not supported — ignore
  }
}

function clearBadge() {
  badgeCount = 0;
  try {
    navigator.clearAppBadge();
  } catch {
    // Badge API not supported — ignore
  }
}

export function useSnapshotNotifications(
  snapshot: EventSnapshot | null,
  participantKey: string | null
) {
  const prevSnapshotRef = useRef<EventSnapshot | null>(null);
  const initializedRef = useRef(false);

  // Clear badge when page becomes visible
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) {
        clearBadge();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!snapshot || !participantKey) return;

    // Skip initial load — don't toast on first snapshot
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevSnapshotRef.current = snapshot;
      return;
    }

    const prev = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    if (!prev) return;

    const messages: string[] = [];

    // Build lookup maps
    const prevResponsesByKey = new Map<string, Response>();
    for (const r of prev.responses) {
      prevResponsesByKey.set(r.participantKey, r);
    }

    const locationNameById = new Map<string, string>();
    for (const loc of snapshot.locations) {
      locationNameById.set(loc.id, loc.name);
    }

    // Detect response changes by others
    for (const r of snapshot.responses) {
      if (r.participantKey === participantKey) continue;

      const prevR = prevResponsesByKey.get(r.participantKey);

      if (!prevR) {
        // New participant joined
        if (r.isIn) {
          messages.push(`${r.name} is in!`);
        }
        continue;
      }

      // Toggle in/out
      if (r.isIn && !prevR.isIn) {
        messages.push(`${r.name} is in!`);
      } else if (!r.isIn && prevR.isIn) {
        messages.push(`${r.name} is out`);
      }

      // Vote changes (new votes only, ignore removals to reduce noise)
      const prevVoteSet = new Set(prevR.locationVotes);
      const newVotes = r.locationVotes.filter((id) => !prevVoteSet.has(id));
      if (newVotes.length > 0 && !r.preferredLocationId) {
        const names = newVotes
          .map((id) => locationNameById.get(id))
          .filter(Boolean);
        if (names.length > 0) {
          messages.push(`${r.name} voted for ${names.join(", ")}`);
        }
      }

      // Preferred location changed
      if (r.preferredLocationId && r.preferredLocationId !== prevR.preferredLocationId) {
        const locName = locationNameById.get(r.preferredLocationId);
        if (locName) {
          messages.push(`${r.name}'s top pick: ${locName}`);
        }
      }
    }

    // Detect participants who left (response removed entirely)
    for (const prevR of prev.responses) {
      if (prevR.participantKey === participantKey) continue;
      const stillExists = snapshot.responses.some(
        (r) => r.participantKey === prevR.participantKey
      );
      if (!stillExists && prevR.isIn) {
        messages.push(`${prevR.name} is out`);
      }
    }

    // Detect new locations
    const nameByKey = new Map<string, string>();
    for (const r of snapshot.responses) {
      nameByKey.set(r.participantKey, r.name);
    }
    const prevLocationIds = new Set(prev.locations.map((l: Location) => l.id));
    for (const loc of snapshot.locations) {
      if (!prevLocationIds.has(loc.id)) {
        const adder = loc.addedBy ? nameByKey.get(loc.addedBy) : null;
        messages.push(adder ? `${adder} added ${loc.name}` : `New spot: ${loc.name}`);
      }
    }

    // Detect event finalized
    if (snapshot.event.status === "finalized" && prev.event.status !== "finalized") {
      messages.push("Lunch is finalized!");
    }

    // Show toasts and update badge
    for (const msg of messages) {
      toast(msg);
      if (document.hidden) {
        incrementBadge();
      }
    }
  }, [snapshot, participantKey]);
}
