"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEventStream } from "@/hooks/useEventStream";
import { useParticipantKey } from "@/hooks/useParticipantKey";
import { useParticipantName } from "@/hooks/useParticipantName";
import { useSnapshotNotifications } from "@/hooks/useSnapshotNotifications";
import { toast } from "sonner";
import { EventHeader } from "@/components/event/EventHeader";
import { AttendeeToggle } from "@/components/event/AttendeeToggle";
import { TimeRangeSlider } from "@/components/event/TimeRangeSlider";
import { LocationVoting } from "@/components/event/LocationVoting";
import { AttendeeList } from "@/components/event/AttendeeList";
import { FinalizedBanner } from "@/components/event/FinalizedBanner";
import { ConnectionStatus } from "@/components/event/ConnectionStatus";
import { ShareButton } from "@/components/event/ShareButton";
import { Leaderboard } from "@/components/event/Leaderboard";
import { PastLunches } from "@/components/event/PastLunches";
import { NearbyRestaurants } from "@/components/event/NearbyRestaurants";
import { SummaryPanel } from "@/components/admin/SummaryPanel";
import type { EventSnapshot } from "@/types";

interface EventPageContentProps {
  groupSlug: string;
}

export function EventPageContent({ groupSlug }: EventPageContentProps) {
  const { key: participantKey } = useParticipantKey();
  const { name: savedName, setName: persistName } = useParticipantName();
  const [initialSnapshot, setInitialSnapshot] = useState<EventSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = `/api/events/current?group=${encodeURIComponent(groupSlug)}`;

  // Fetch initial data
  useEffect(() => {
    fetch(apiUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setInitialSnapshot(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiUrl]);

  const eventId = initialSnapshot?.event?.id || null;
  const { snapshot: liveSnapshot, connectionState, refresh } = useEventStream(eventId, groupSlug);
  const snapshot = liveSnapshot || initialSnapshot;

  useSnapshotNotifications(snapshot, participantKey);

  const myResponse = snapshot?.responses?.find(
    (r) => r.participantKey === participantKey
  );

  const [status, setStatus] = useState<"in" | "out" | "maybe">("out");
  const [name, setName] = useState(savedName || "");
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [availableTo, setAvailableTo] = useState<string | null>(null);
  const [locationVotes, setLocationVotes] = useState<string[]>([]);
  const [preferredLocationId, setPreferredLocationId] = useState<string | null>(null);

  // Initialize name from localStorage once loaded
  useEffect(() => {
    if (savedName && !name) {
      setName(savedName);
    }
  }, [savedName]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setStatus(myResponse.status);
    setName(myResponse.name);
    persistName(myResponse.name);
    setAvailableFrom(myResponse.availableFrom);
    setAvailableTo(myResponse.availableTo);
    setLocationVotes(myResponse.locationVotes);
    setPreferredLocationId(myResponse.preferredLocationId);
  }, [myResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitResponse = useCallback(
    async (updates: {
      status: "in" | "out" | "maybe";
      name: string;
      availableFrom: string | null;
      availableTo: string | null;
      locationVotes: string[];
      preferredLocationId: string | null;
    }) => {
      if (!snapshot?.event || !participantKey) return;
      try {
        const res = await fetch(`/api/events/${snapshot.event.id}/responses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantKey,
            ...updates,
          }),
        });
        if (!res.ok) {
          toast.error("Couldn't save, try again");
        }
      } catch {
        toast.error("Couldn't save, try again");
      }
    },
    [snapshot?.event, participantKey]
  );

  const handleToggle = (newStatus: "in" | "out" | "maybe", newName: string) => {
    setStatus(newStatus);
    setName(newName);
    persistName(newName);
    const from = availableFrom || "12:00";
    const to = availableTo || snapshot?.event?.latestTime || "13:30";
    if (newStatus === "in" && !availableFrom) {
      setAvailableFrom(from);
      setAvailableTo(to);
    }
    // Clear votes when not "in"
    const votes = newStatus === "in" ? locationVotes : [];
    const preferred = newStatus === "in" ? preferredLocationId : null;
    if (newStatus !== "in") {
      setLocationVotes([]);
      setPreferredLocationId(null);
    }
    submitResponse({
      status: newStatus,
      name: newName,
      availableFrom: newStatus === "in" ? from : availableFrom,
      availableTo: newStatus === "in" ? to : availableTo,
      locationVotes: votes,
      preferredLocationId: preferred,
    });
  };

  const handleTimeChange = (from: string, to: string) => {
    setAvailableFrom(from);
    setAvailableTo(to);
    submitResponse({ status, name, availableFrom: from, availableTo: to, locationVotes, preferredLocationId });
  };

  const handleVote = (newVotes: string[]) => {
    // Auto-clear preference if the preferred location is being un-voted
    const newPreferred = preferredLocationId && newVotes.includes(preferredLocationId)
      ? preferredLocationId
      : null;
    setLocationVotes(newVotes);
    setPreferredLocationId(newPreferred);
    submitResponse({ status, name, availableFrom, availableTo, locationVotes: newVotes, preferredLocationId: newPreferred });
  };

  const handlePreference = (locationId: string | null) => {
    setPreferredLocationId(locationId);
    submitResponse({ status, name, availableFrom, availableTo, locationVotes, preferredLocationId: locationId });
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
      <div className="flex justify-center min-h-screen">
        <main className="w-full max-w-[430px] min-h-screen shadow-2xl bg-[#f8f7f5]">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <span className="material-symbols-outlined text-slate-300 text-[64px] mb-2">restaurant</span>
              <p className="text-2xl font-bold mb-2 text-slate-700">No lunch scheduled yet</p>
              <p className="text-slate-400">Check back later!</p>
            </div>
          </div>
          <div className="px-6 pb-8 space-y-5">
            <Leaderboard participantKey={participantKey} groupSlug={groupSlug} />
            <PastLunches groupSlug={groupSlug} />
            <NearbyRestaurants />
          </div>
        </main>
      </div>
    );
  }

  const { event, locations, responses } = snapshot;
  const isFinalized = event.status === "finalized";
  const adminHref = `/g/${groupSlug}/admin`;

  return (
    <div className="flex justify-center min-h-screen">
      <main className="w-full max-w-[430px] min-h-screen shadow-2xl bg-[#f8f7f5]">
        <header className="pt-6 px-6 pb-4 bg-white sticky top-0 z-20 border-b border-orange-500/10">
          <EventHeader event={event} shareButton={<ShareButton event={event} groupSlug={groupSlug} />} />
        </header>

        <div className="px-6 pb-8 pt-6 space-y-5">
          {isFinalized && <FinalizedBanner event={event} locations={locations} />}

          <AttendeeToggle
            status={status}
            name={name}
            onToggle={handleToggle}
            disabled={isFinalized}
          />

          {responses.length > 0 && (
            <SummaryPanel snapshot={snapshot} showTimeDistribution={false} />
          )}

          {status === "in" && !isFinalized && (
            <TimeRangeSlider
              earliestTime={event.earliestTime}
              latestTime={event.latestTime}
              availableFrom={availableFrom}
              availableTo={availableTo}
              onChange={handleTimeChange}
            />
          )}

          {status === "in" && !isFinalized && (
            <LocationVoting
              locations={locations}
              responses={responses}
              selectedIds={locationVotes}
              onVote={handleVote}
              preferredLocationId={preferredLocationId}
              onPreference={handlePreference}
              eventId={event.id}
              participantKey={participantKey ?? undefined}
              onLocationAdded={refresh}
            />
          )}

          <AttendeeList responses={responses} locations={locations} currentParticipantKey={participantKey} />

          <Leaderboard participantKey={participantKey} groupSlug={groupSlug} />
          <PastLunches groupSlug={groupSlug} />
          <NearbyRestaurants />

          <div className="text-center pt-2 pb-4">
            <a href={adminHref} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
              Admin
            </a>
          </div>
        </div>
        <ConnectionStatus state={connectionState} />
      </main>
    </div>
  );
}
