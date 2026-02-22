"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EventSnapshot } from "@/types";

type ConnectionState = "connecting" | "connected" | "polling" | "disconnected";

export function useEventStream(eventId: string | null) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/events/current");
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch {
      // ignore fetch errors during polling
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setConnectionState("polling");
    fetchSnapshot();
    pollingRef.current = setInterval(fetchSnapshot, 2000);
  }, [fetchSnapshot]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;

    setConnectionState("connecting");
    const es = new EventSource(`/api/events/${eventId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionState("connected");
      stopPolling();
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as EventSnapshot;
        setSnapshot(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      startPolling();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      stopPolling();
    };
  }, [eventId, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, connectionState, refresh };
}
