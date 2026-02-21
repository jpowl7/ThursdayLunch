"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { EventSnapshot } from "@/types";

interface FinalizeControlsProps {
  snapshot: EventSnapshot;
  token: string;
  onFinalized: () => void;
}

export function FinalizeControls({ snapshot, token, onFinalized }: FinalizeControlsProps) {
  const { event, locations } = snapshot;
  const [chosenTime, setChosenTime] = useState(event.earliestTime);
  const [chosenLocationId, setChosenLocationId] = useState(locations[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

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
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">Finalize Event</h3>
        <div>
          <Label htmlFor="chosenTime">Time</Label>
          <Input
            id="chosenTime"
            type="time"
            value={chosenTime}
            onChange={(e) => setChosenTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="chosenLocation">Location</Label>
          <select
            id="chosenLocation"
            value={chosenLocationId}
            onChange={(e) => setChosenLocationId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button
          onClick={handleFinalize}
          disabled={submitting || !chosenLocationId}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {submitting ? "Finalizing..." : "Finalize Event"}
        </Button>

        <div className="pt-4 border-t">
          <Label>Share Link</Label>
          <div className="flex gap-2 mt-1">
            <Input value={shareUrl} readOnly />
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
