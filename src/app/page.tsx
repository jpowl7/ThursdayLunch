"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventStream } from "@/hooks/useEventStream";
import { useParticipantKey } from "@/hooks/useParticipantKey";
import { useSnapshotNotifications } from "@/hooks/useSnapshotNotifications";
import { EventHeader } from "@/components/event/EventHeader";
import { AttendeeToggle } from "@/components/event/AttendeeToggle";
import { TimeRangeSlider } from "@/components/event/TimeRangeSlider";
import { LocationVoting } from "@/components/event/LocationVoting";
import { AttendeeList } from "@/components/event/AttendeeList";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { ConnectionStatus } from "@/components/event/ConnectionStatus";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import type { EventSnapshot } from "@/types";

export default function HomePage() {
  const participantKey = useParticipantKey();
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    fetch("/api/events/current")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setInitialSnapshot(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot, connectionState, refresh } = useEventStream(eventId);
  const snapshot = liveSnapshot || initialSnapshot;

  useSnapshotNotifications(snapshot, participantKey);

  const myResponse = snapshot?.responses?.find(
    (r) => r.participantKey === participantKey
  );

  const [isIn, setIsIn] = useState(false);
  const [name, setName] = useState("");
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [availableTo, setAvailableTo] = useState<string | null>(null);
  const [locationVotes, setLocationVotes] = useState<string[]>([]);
  const [preferredLocationId, setPreferredLocationId] = useState<string | null>(null);

  // Sync local state with server response (only when data actually changes)
  const lastSyncedId = useRef<string | null>(null);
  const lastSyncedUpdatedAt = useRef<string | null>(null);
  useEffect(() => {
    if (!myResponse) return;
    // Only sync if the response ID or updatedAt changed
    if (
      myResponse.id === lastSyncedId.current &&
      myResponse.updatedAt === lastSyncedUpdatedAt.current
    ) return;
    lastSyncedId.current = myResponse.id;
    lastSyncedUpdatedAt.current = myResponse.updatedAt;
    setIsIn(myResponse.isIn);
    setName(myResponse.name);
    setAvailableFrom(myResponse.availableFrom);
    setAvailableTo(myResponse.availableTo);
    setLocationVotes(myResponse.locationVotes);
    setPreferredLocationId(myResponse.preferredLocationId);
  }, [myResponse]);

  const submitResponse = useCallback(
    async (updates: {
      isIn: boolean;
      name: string;
      availableFrom: string | null;
      availableTo: string | null;
      locationVotes: string[];
      preferredLocationId: string | null;
    }) => {
      if (!snapshot?.event || !participantKey) return;
      try {
        await fetch(`/api/events/${snapshot.event.id}/responses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantKey,
            ...updates,
          }),
        });
      } catch {
        // ignore
      }
    },
    [snapshot?.event, participantKey]
  );

  const handleToggle = (newIsIn: boolean, newName: string) => {
    setIsIn(newIsIn);
    setName(newName);
    const from = availableFrom || "12:00";
    const to = availableTo || snapshot?.event?.latestTime || "13:30";
    if (newIsIn && !availableFrom) {
      setAvailableFrom(from);
      setAvailableTo(to);
    }
    submitResponse({
      isIn: newIsIn,
      name: newName,
      availableFrom: newIsIn ? from : availableFrom,
      availableTo: newIsIn ? to : availableTo,
      locationVotes,
      preferredLocationId,
    });
  };

  const handleTimeChange = (from: string, to: string) => {
    setAvailableFrom(from);
    setAvailableTo(to);
    submitResponse({ isIn, name, availableFrom: from, availableTo: to, locationVotes, preferredLocationId });
  };

  const handleVote = (newVotes: string[]) => {
    // Auto-clear preference if the preferred location is being un-voted
    const newPreferred = preferredLocationId && newVotes.includes(preferredLocationId)
      ? preferredLocationId
      : null;
    setLocationVotes(newVotes);
    setPreferredLocationId(newPreferred);
    submitResponse({ isIn, name, availableFrom, availableTo, locationVotes: newVotes, preferredLocationId: newPreferred });
  };

  const handlePreference = (locationId: string | null) => {
    setPreferredLocationId(locationId);
    submitResponse({ isIn, name, availableFrom, availableTo, locationVotes, preferredLocationId: locationId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-orange-300 text-[48px] animate-pulse">lunch_dining</span>
          <p className="text-slate-400 mt-2 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-slate-300 text-[64px] mb-2">restaurant</span>
          <p className="text-2xl font-bold mb-2 text-slate-700">No lunch scheduled yet</p>
          <p className="text-slate-400">Check back later!</p>
        </div>
      </div>
    );
  }

  const { event, locations, responses } = snapshot;
  const isFinalized = event.status === "finalized";

  return (
    <div className="flex justify-center min-h-screen">
      <main className="w-full max-w-[430px] min-h-screen shadow-2xl bg-[#f8f7f5]">
        <header className="pt-6 px-6 pb-4 bg-white sticky top-0 z-20 border-b border-orange-500/10">
          <EventHeader event={event} />
        </header>

        <div className="px-6 pb-8 pt-6 space-y-5">
          {isFinalized && <FinalizedBanner event={event} locations={locations} />}

          <AttendeeToggle
            isIn={isIn}
            name={name}
            onToggle={handleToggle}
            disabled={isFinalized}
          />

          {responses.length > 0 && (
            <SummaryPanel snapshot={snapshot} showTimeDistribution={false} />
          )}

          {isIn && !isFinalized && (
            <TimeRangeSlider
              earliestTime={event.earliestTime}
              latestTime={event.latestTime}
              availableFrom={availableFrom}
              availableTo={availableTo}
              onChange={handleTimeChange}
            />
          )}

          {isIn && !isFinalized && (
            <LocationVoting
              locations={locations}
              responses={responses}
              selectedIds={locationVotes}
              onVote={handleVote}
              preferredLocationId={preferredLocationId}
              onPreference={handlePreference}
              eventId={event.id}
              onLocationAdded={refresh}
            />
          )}

          <AttendeeList responses={responses} locations={locations} currentParticipantKey={participantKey} />
        </div>
        <ConnectionStatus state={connectionState} />
      </main>
    </div>
  );
}
