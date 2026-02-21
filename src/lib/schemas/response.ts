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
});

export type Response = z.infer<typeof ResponseSchema>;
export type UpsertResponseInput = z.infer<typeof UpsertResponseSchema>;
