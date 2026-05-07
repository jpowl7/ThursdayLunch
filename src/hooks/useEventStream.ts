"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EventSnapshot } from "@/types";

const POLL_INTERVAL = 3000;

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

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setConnectionState("polling");
    fetchSnapshot();
    pollingRef.current = setInterval(fetchSnapshot, POLL_INTERVAL);
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

  useEffect(() => {
    if (!eventId) return;

    const handleVisibility = () => {
      if (document.hidden || isFinalized) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    if (!document.hidden && !isFinalized) {
      startPolling();
    } else if (isFinalized) {
      stopPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
  }, [eventId, isFinalized, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, connectionState, refresh };
}
