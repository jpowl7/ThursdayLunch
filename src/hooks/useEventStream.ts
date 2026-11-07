"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EventSnapshot } from "@/types";

// While voting is open, changes arrive constantly (RSVPs, votes, new restaurants).
const POLL_INTERVAL = 30000;
// Once finalized the only thing that can change is an admin reopening it, so a visible
// tab checks much less often. Hidden tabs never poll, whatever the state.
const FINALIZED_POLL_INTERVAL = 5 * 60 * 1000;

type ConnectionState = "polling" | "disconnected";

export function useEventStream(eventId: string | null, groupSlug: string) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/current?group=${encodeURIComponent(groupSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch {
      // ignore fetch errors during polling
    }
  }, [groupSlug]);

  // `immediate` fetches right away (tab came back into view, data is stale). On first
  // start the caller has just loaded the snapshot itself, so we only schedule the timer
  // instead of fetching the same thing a second time.
  const startPolling = useCallback((immediate: boolean, intervalMs: number) => {
    if (pollingRef.current) return;
    setConnectionState("polling");
    if (immediate) fetchSnapshot();
    pollingRef.current = setInterval(fetchSnapshot, intervalMs);
  }, [fetchSnapshot]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setConnectionState("disconnected");
  }, []);

  const eventStatus = snapshot?.event?.status ?? null;
  const isFinalized = eventStatus !== null && eventStatus !== "open";
  const intervalMs = isFinalized ? FINALIZED_POLL_INTERVAL : POLL_INTERVAL;

  useEffect(() => {
    if (!eventId) return;

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling(true, intervalMs);
      }
    };

    if (!document.hidden) {
      startPolling(false, intervalMs);
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
  }, [eventId, intervalMs, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, connectionState, refresh };
}
