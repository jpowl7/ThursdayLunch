import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  /** One-way hash of the adder's participant key (never the raw key). */
  addedByHash: z.string().nullable(),
  createdAt: z.string(),
});

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const TimeString = z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM");
/** Only web links — a plain .url() would also accept javascript: or data: URLs. */
const HttpUrl = z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link");
/** Google Places autocomplete session token, minted by the browser (see PlacesAutocomplete). */
const SessionToken = z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional();

export const CreateLocationInput = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().max(300).optional(),
  mapsUrl: HttpUrl.optional(),
  placeId: z.string().max(300).optional(),
  sessionToken: SessionToken,
});

export const EventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  date: z.string(),
  earliestTime: z.string(),
  latestTime: z.string(),
  status: z.enum(["open", "finalized", "cancelled"]),
  chosenTime: z.string().nullable(),
  chosenLocationId: z.string().uuid().nullable(),
  createdAt: z.string(),
  goLiveAt: z.string().nullable(),
  delayStartAt: z.string().nullable(),
  delayEndAt: z.string().nullable(),
  votingDeadline: z.string().nullable(),
});

export const CreateEventSchema = z.object({
  title: z.string().trim().min(1).max(100),
  date: DateString,
  earliestTime: TimeString,
  latestTime: TimeString,
  locations: z.array(CreateLocationInput).max(30),
  groupSlug: z.string().min(1).max(50),
  delayWindow: z.enum(["none", "15", "30", "60", "120"]).optional().default("none"),
  delayStartTime: TimeString.optional(),
  delayStartDate: DateString.optional(),
  votingDeadlineTime: TimeString.optional(),
});

export const MAX_LOCATIONS_PER_EVENT = 30;

export const AddLocationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  placeId: z.string().max(300).optional(),
  sessionToken: SessionToken,
  /** Known details (from a "past location" chip) so the server can skip the Google lookup. */
  address: z.string().max(300).optional(),
  mapsUrl: HttpUrl.optional(),
  websiteUrl: HttpUrl.optional(),
  /** The adder's raw participant key; required so only real participants can add. */
  addedBy: z.string().min(1).max(100),
});

export const DeleteLocationSchema = z.object({
  participantKey: z.string().min(1).max(100),
});

export const RenameLocationSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type Event = z.infer<typeof EventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type Location = z.infer<typeof LocationSchema>;
