"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface CreateEventFormProps {
  token: string;
  onCreated: () => void;
}

interface LocationInput {
  name: string;
  address: string;
  mapsUrl: string;
}

export function CreateEventForm({ token, onCreated }: CreateEventFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [earliestTime, setEarliestTime] = useState("11:00");
  const [latestTime, setLatestTime] = useState("13:30");
  const [locations, setLocations] = useState<LocationInput[]>([
    { name: "", address: "", mapsUrl: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addLocation = () => {
    setLocations([...locations, { name: "", address: "", mapsUrl: "" }]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof LocationInput, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const validLocations = locations.filter((l) => l.name.trim());
    if (validLocations.length === 0) {
      setError("Add at least one location");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          date,
          earliestTime,
          latestTime,
          locations: validLocations.map((l) => ({
            name: l.name.trim(),
            address: l.address.trim() || undefined,
            mapsUrl: l.mapsUrl.trim() || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create event");
        return;
      }

      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">Create New Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thursday Lunch — Feb 27"
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="earliest">Earliest Time</Label>
              <Input
                id="earliest"
                type="time"
                value={earliestTime}
                onChange={(e) => setEarliestTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="latest">Latest Time</Label>
              <Input
                id="latest"
                type="time"
                value={latestTime}
                onChange={(e) => setLatestTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Locations</Label>
            {locations.map((loc, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    value={loc.name}
                    onChange={(e) => updateLocation(i, "name", e.target.value)}
                    placeholder="Restaurant name"
                  />
                  <Input
                    value={loc.address}
                    onChange={(e) => updateLocation(i, "address", e.target.value)}
                    placeholder="Address (optional)"
                  />
                  <Input
                    value={loc.mapsUrl}
                    onChange={(e) => updateLocation(i, "mapsUrl", e.target.value)}
                    placeholder="Google Maps URL (optional)"
                  />
                </div>
                {locations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLocation(i)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLocation}>
              + Add Location
            </Button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
