import { unstable_cache, revalidateTag } from "next/cache";
import { getPendingCronInstants } from "@/lib/db/queries";

/**
 * The cron runs every 5 minutes, but the database should stay asleep unless there is
 * actual work: an event going live, a voting deadline passing, or the weekly Thursday
 * lifecycle. The list of upcoming go-live/deadline instants is small and changes only
 * when an event is created, cancelled, finalized, or has its deadline edited, so we keep
 * it in Next's data cache and refresh it from those write paths. Each cron tick then
 * reads the cache (no database) and only opens a connection when something is due.
 */
const CRON_PENDING_TAG = "cron-pending";

export const getCachedPendingInstants = unstable_cache(
  async () => getPendingCronInstants(),
  ["cron-pending-instants"],
  { tags: [CRON_PENDING_TAG], revalidate: 60 * 60 * 24 }
);

/** Call after any write that adds, removes, or moves a go-live time or voting deadline. */
export function invalidatePendingInstants() {
  try {
    revalidateTag(CRON_PENDING_TAG);
  } catch (error) {
    // Never let cache bookkeeping break the request that did the real work.
    console.error("Failed to invalidate cron pending cache:", error);
  }
}
