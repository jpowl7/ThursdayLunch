import { claimAutoFinalize, getEventSnapshot, finalizeEvent, getAllGroupIds } from "./db/queries";
import { sendPushToGroup } from "./push";

/**
 * Calculate the best venue and time from an event snapshot.
 * Returns null if there aren't enough votes to make a decision.
 */
export function calculateAutoFinalizeDefaults(snapshot: {
  event: { id: string; earliestTime: string; latestTime: string };
  locations: { id: string }[];
  responses: {
    status: string;
    locationVotes: string[];
    preferredLocationId: string | null;
    vetoLocationId: string | null;
    availableFrom: string | null;
    availableTo: string | null;
  }[];
}): { chosenLocationId: string; chosenTime: string } | null {
  const { event, locations, responses } = snapshot;
  const inResponses = responses.filter((r) => r.status === "in");

  if (locations.length === 0 || inResponses.length === 0) return null;

  // Collect vetoed locations
  const vetoedIds = new Set<string>();
  for (const r of inResponses) {
    if (r.vetoLocationId) vetoedIds.add(r.vetoLocationId);
  }

  const eligible = locations.filter((l) => !vetoedIds.has(l.id));
  if (eligible.length === 0) return null;

  // Weighted scoring: votes + star bonus
  const voteCounts = new Map<string, number>();
  const prefCounts = new Map<string, number>();
  for (const r of inResponses) {
    for (const locId of r.locationVotes) {
      voteCounts.set(locId, (voteCounts.get(locId) || 0) + 1);
    }
    if (r.preferredLocationId) {
      prefCounts.set(r.preferredLocationId, (prefCounts.get(r.preferredLocationId) || 0) + 1);
    }
  }

  const topLocation = [...eligible].sort((a, b) => {
    const scoreA = (voteCounts.get(a.id) || 0) + (prefCounts.get(a.id) || 0);
    const scoreB = (voteCounts.get(b.id) || 0) + (prefCounts.get(b.id) || 0);
    return scoreB - scoreA;
  })[0];

  // Peak overlap time (same algorithm as FinalizeControls)
  const [eh, em] = event.earliestTime.split(":").map(Number);
  const [lh, lm] = event.latestTime.split(":").map(Number);
  const startMin = eh * 60 + em;
  const endMin = lh * 60 + lm;
  let maxCount = 0;
  let peakTime = event.earliestTime;
  for (let m = startMin; m <= endMin; m += 15) {
    let count = 0;
    for (const r of inResponses) {
      if (r.availableFrom && r.availableTo) {
        const [fh, fm2] = r.availableFrom.split(":").map(Number);
        const [th, tm2] = r.availableTo.split(":").map(Number);
        if (m >= fh * 60 + fm2 && m <= th * 60 + tm2) count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      peakTime = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
    }
  }

  return { chosenLocationId: topLocation.id, chosenTime: peakTime };
}

/**
 * Process auto-finalization for a single group.
 * Returns true if an event was finalized.
 */
export async function processAutoFinalizeForGroup(groupId: string, groupSlug: string): Promise<boolean> {
  const claimed = await claimAutoFinalize(groupId);
  if (!claimed) return false;

  const eventId = claimed.id as string;
  const snapshot = await getEventSnapshot(eventId);
  if (!snapshot) return false;

  const defaults = calculateAutoFinalizeDefaults(snapshot);
  if (!defaults) {
    // Can't calculate — leave event open for admin to handle
    return false;
  }

  const result = await finalizeEvent(eventId, defaults.chosenTime, defaults.chosenLocationId);
  if (!result) return false;

  // Send push notification
  const locationName = snapshot.locations.find((l) => l.id === defaults.chosenLocationId)?.name || "a restaurant";
  await sendPushToGroup(groupId, {
    title: "It's decided!",
    body: `We're eating at ${locationName} at ${defaults.chosenTime}.`,
    url: `/g/${groupSlug}`,
    tag: `finalized-${eventId}`,
  });

  return true;
}

/**
 * Check all groups for events needing auto-finalization.
 */
export async function processAutoFinalizeAll(): Promise<number> {
  const groups = await getAllGroupIds();
  let count = 0;
  for (const group of groups) {
    const finalized = await processAutoFinalizeForGroup(group.id, group.slug);
    if (finalized) count++;
  }
  return count;
}
