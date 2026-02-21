"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Location, Response } from "@/lib/schemas";

interface LocationVotingProps {
  locations: Location[];
  responses: Response[];
  selectedIds: string[];
  onVote: (locationIds: string[]) => void;
  disabled?: boolean;
}

export function LocationVoting({
  locations,
  responses,
  selectedIds,
  onVote,
  disabled,
}: LocationVotingProps) {
  // Count votes per location
  const voteCounts = new Map<string, number>();
  for (const r of responses) {
    if (r.isIn) {
      for (const locId of r.locationVotes) {
        voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
      }
    }
  }

  const toggleLocation = (id: string) => {
    if (disabled) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id];
    onVote(next);
  };

  const sorted = [...locations].sort(
    (a, b) => (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
  );

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Where to eat?</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((loc) => {
          const isSelected = selectedIds.includes(loc.id);
          const count = voteCounts.get(loc.id) || 0;
          return (
            <Card
              key={loc.id}
              onClick={() => toggleLocation(loc.id)}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-orange-500 bg-orange-50"
                  : "hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-default" : ""}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{loc.name}</p>
                  {loc.address && (
                    <p className="text-sm text-muted-foreground">{loc.address}</p>
                  )}
                  {loc.mapsUrl && (
                    <a
                      href={loc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View map
                    </a>
                  )}
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {count}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
