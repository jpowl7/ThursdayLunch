"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EventSnapshot } from "@/types";

const POLL_INTERVAL = 30000;

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

  useEffect(() => {
    if (!eventId) return;

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
  }, [eventId, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, connectionState, refresh };
}
