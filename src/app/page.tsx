"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventStream } from "@/hooks/useEventStream";
import { useParticipantKey } from "@/hooks/useParticipantKey";
import { EventHeader } from "@/components/event/EventHeader";
import { AttendeeToggle } from "@/components/event/AttendeeToggle";
import { TimeRangeSlider } from "@/components/event/TimeRangeSlider";
import { LocationVoting } from "@/components/event/LocationVoting";
import { AttendeeList } from "@/components/event/AttendeeList";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
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
  const { snapshot: liveSnapshot } = useEventStream(eventId);
  const snapshot = liveSnapshot || initialSnapshot;

  const myResponse = snapshot?.responses?.find(
    (r) => r.participantKey === participantKey
  );

  const [isIn, setIsIn] = useState(false);
  const [name, setName] = useState("");
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [availableTo, setAvailableTo] = useState<string | null>(null);
  const [locationVotes, setLocationVotes] = useState<string[]>([]);

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
  }, [myResponse]);

  const submitResponse = useCallback(
    async (updates: {
      isIn: boolean;
      name: string;
      availableFrom: string | null;
      availableTo: string | null;
      locationVotes: string[];
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
    const from = availableFrom || snapshot?.event?.earliestTime || "11:00";
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
    });
  };

  const handleTimeChange = (from: string, to: string) => {
    setAvailableFrom(from);
    setAvailableTo(to);
    submitResponse({ isIn, name, availableFrom: from, availableTo: to, locationVotes });
  };

  const handleVote = (newVotes: string[]) => {
    setLocationVotes(newVotes);
    submitResponse({ isIn, name, availableFrom, availableTo, locationVotes: newVotes });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">No lunch scheduled yet</p>
          <p className="text-muted-foreground">Check back later!</p>
        </div>
      </div>
    );
  }

  const { event, locations, responses } = snapshot;
  const isFinalized = event.status === "finalized";

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <EventHeader event={event} />

      {isFinalized && <FinalizedBanner event={event} locations={locations} />}

      <div className="space-y-6">
        <AttendeeToggle
          isIn={isIn}
          name={name}
          onToggle={handleToggle}
          disabled={isFinalized}
        />

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
          />
        )}

        <AttendeeList responses={responses} locations={locations} />
      </div>
    </main>
  );
}
