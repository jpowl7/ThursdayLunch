import { z } from "zod";

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  participantKey: z.string(),
  name: z.string().min(1),
  status: z.enum(["in", "out", "maybe"]),
  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  locationVotes: z.array(z.string().uuid()),
  preferredLocationId: z.string().uuid().nullable(),
  vetoLocationId: z.string().uuid().nullable(),
  vetoReason: z.string().nullable(),
  noShow: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UpsertResponseSchema = z.object({
  participantKey: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["in", "out", "maybe"]),
  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  locationVotes: z.array(z.string().uuid()),
  preferredLocationId: z.string().uuid().nullable(),
  vetoLocationId: z.string().uuid().nullable().default(null),
  vetoReason: z.string().nullable().default(null),
}).refine(
  (data) => !data.preferredLocationId || data.locationVotes.includes(data.preferredLocationId),
  { message: "Preferred location must be one of your voted locations", path: ["preferredLocationId"] }
).refine(
  (data) => !data.vetoLocationId || !data.locationVotes.includes(data.vetoLocationId),
  { message: "Cannot veto a location you voted for", path: ["vetoLocationId"] }
);

export const ToggleResponseSchema = z.object({
  status: z.enum(["in", "out", "maybe"]),
});

export const ToggleNoShowSchema = z.object({
  noShow: z.boolean(),
});

export type Response = z.infer<typeof ResponseSchema>;
export type UpsertResponseInput = z.infer<typeof UpsertResponseSchema>;
