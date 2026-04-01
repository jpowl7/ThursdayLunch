import { z } from "zod";

export const UpsertRecurringScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  titleTemplate: z.string().min(1).max(100),
  earliestTime: z.string().regex(/^\d{2}:\d{2}$/),
  latestTime: z.string().regex(/^\d{2}:\d{2}$/),
  createDaysBefore: z.number().int().min(0).max(7),
  delayWindow: z.enum(["none", "15", "30", "60", "120"]).default("none"),
  delayStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  votingDeadlineTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  active: z.boolean().default(true),
});

export type UpsertRecurringScheduleInput = z.infer<typeof UpsertRecurringScheduleSchema>;
