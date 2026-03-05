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

export interface LeaderboardEntry {
  name: string;
  count: number;
}

export interface LeaderboardData {
  totalEvents: number;
  attendance: LeaderboardEntry[];
  tastemaker: LeaderboardEntry[];
  firstResponder: LeaderboardEntry[];
  streaks: LeaderboardEntry[];
  speedDemon: LeaderboardEntry[];
  fashionablyLate: LeaderboardEntry[];
  trendsetter: LeaderboardEntry[];
}

export interface Group {
  id: string;
  slug: string;
  name: string;
  passcode: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  pin: string;
  participantKey: string;
  createdAt: string;
}
