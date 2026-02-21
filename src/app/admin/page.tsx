"use client";

import { useState, useEffect, useCallback, use } from "react";
import { EventHeader } from "@/components/event/EventHeader";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import { FinalizeControls } from "@/components/admin/FinalizeControls";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { AttendeeList } from "@/components/event/AttendeeList";
import { useEventStream } from "@/hooks/useEventStream";
import type { EventSnapshot } from "@/types";

interface AdminPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  const { token } = use(searchParams);
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/events/current");
      if (res.ok) {
        const data = await res.json();
        setInitialSnapshot(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Validate token client-side by checking it's not empty
    // Real validation happens on API calls
    if (token) {
      setAuthorized(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token, fetchData]);

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot } = useEventStream(eventId);
  const snapshot = liveSnapshot || initialSnapshot;

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Unauthorized. Add ?token=YOUR_TOKEN to the URL.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {!snapshot ? (
        <CreateEventForm token={token!} onCreated={fetchData} />
      ) : (
        <div className="space-y-6">
          <EventHeader event={snapshot.event} />

          {snapshot.event.status === "finalized" && (
            <FinalizedBanner event={snapshot.event} locations={snapshot.locations} />
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <SummaryPanel snapshot={snapshot} />
            {snapshot.event.status === "open" && (
              <FinalizeControls
                snapshot={snapshot}
                token={token!}
                onFinalized={fetchData}
              />
            )}
          </div>

          <AttendeeList responses={snapshot.responses} locations={snapshot.locations} />

          {snapshot.event.status !== "open" && (
            <div className="pt-4">
              <CreateEventForm token={token!} onCreated={fetchData} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
