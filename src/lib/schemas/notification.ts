import { z } from "zod";

export const PushSubscribeSchema = z.object({
  participantKey: z.string().min(1).max(100),
  groupSlug: z.string().min(1).max(50),
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }),
  }),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;

export const PushUnsubscribeSchema = z.object({
  participantKey: z.string().min(1).max(100),
  groupSlug: z.string().min(1).max(50),
  endpoint: z.string().url().max(2000),
});

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;
