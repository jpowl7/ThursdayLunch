import { z } from "zod";

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  participantKey: z.string(),
  name: z.string().min(1),
  isIn: z.boolean(),
  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  locationVotes: z.array(z.string().uuid()),
  preferredLocationId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UpsertResponseSchema = z.object({
  participantKey: z.string().min(1),
  name: z.string().min(1),
  isIn: z.boolean(),
  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  locationVotes: z.array(z.string().uuid()),
  preferredLocationId: z.string().uuid().nullable(),
}).refine(
  (data) => !data.preferredLocationId || data.locationVotes.includes(data.preferredLocationId),
  { message: "Preferred location must be one of your voted locations", path: ["preferredLocationId"] }
);

export type Response = z.infer<typeof ResponseSchema>;
export type UpsertResponseInput = z.infer<typeof UpsertResponseSchema>;
