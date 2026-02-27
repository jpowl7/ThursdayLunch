import { z } from "zod";

export const LocationSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  addedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const CreateLocationInput = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  mapsUrl: z.string().optional(),
  placeId: z.string().optional(),
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
});

export const CreateEventSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  earliestTime: z.string(),
  latestTime: z.string(),
  locations: z.array(CreateLocationInput).min(1),
  groupSlug: z.string().min(1),
});

export const AddLocationSchema = z.object({
  name: z.string().min(1),
  placeId: z.string().optional(),
  addedBy: z.string().optional(),
});

export const DeleteLocationSchema = z.object({
  participantKey: z.string().min(1),
});

export const RenameLocationSchema = z.object({
  name: z.string().min(1),
});

export type Event = z.infer<typeof EventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type Location = z.infer<typeof LocationSchema>;
