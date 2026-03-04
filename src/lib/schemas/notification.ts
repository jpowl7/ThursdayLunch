import { z } from "zod";

export const PushSubscribeSchema = z.object({
  participantKey: z.string().min(1),
  groupSlug: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;

export const PushUnsubscribeSchema = z.object({
  participantKey: z.string().min(1),
  groupSlug: z.string().min(1),
  endpoint: z.string().url(),
});

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;
