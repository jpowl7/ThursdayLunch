import type { Event, Location, Response } from "@/lib/schemas";

export interface EventSnapshot {
  event: Event;
  locations: Location[];
  responses: Response[];
}

export interface LocationVoteTally {
  locationId: string;
  locationName: string;
  count: number;
}
