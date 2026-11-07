import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { checkGroupAdmin } from "@/lib/auth";
import { after } from "next/server";
import { CreateEventSchema } from "@/lib/schemas";
import { createEvent, getGroupBySlug } from "@/lib/db/queries";
import { invalidatePendingInstants } from "@/lib/cron-pending";
import { getPlaceDetails } from "@/lib/google-places";
import { sendPushToGroup } from "@/lib/push";
import { notifyOwner } from "@/lib/owner-email";
import { EASTERN_TZ, easternToUtc, easternToday } from "@/lib/eastern-time";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { locations, groupSlug, delayWindow, delayStartTime, delayStartDate, votingDeadlineTime, ...eventInput } = parsed.data;

    // Compute random go-live time if delay requested
    let goLiveAt: string | null = null;
    let delayStartAt: string | null = null;
    let delayEndAt: string | null = null;
    if (delayWindow && delayWindow !== "none") {
      const windowMs = parseInt(delayWindow) * 60 * 1000;
      const delayMs = Math.floor(Math.random() * windowMs);

      // Use delayStartDate + delayStartTime as base if provided, otherwise now
      // Parse in US Eastern time (Granger, IN) since the time picker is local to the user
      let baseMs = Date.now();
      if (delayStartTime) {
        const startMs = new Date(easternToUtc(delayStartDate || easternToday(), delayStartTime)).getTime();
        // If the requested start is already in the past, start the window now instead.
        if (startMs > Date.now()) baseMs = startMs;
      }
      goLiveAt = new Date(baseMs + delayMs).toISOString();
      delayStartAt = new Date(baseMs).toISOString();
      delayEndAt = new Date(baseMs + windowMs).toISOString();
    }

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

    // Resolve place details for locations with placeId
    const resolvedLocations = await Promise.all(
      locations.map(async (loc) => {
        if (loc.placeId) {
          const details = await getPlaceDetails(loc.placeId, loc.sessionToken);
          if (details) {
            return {
              name: loc.name,
              address: details.address,
              mapsUrl: details.mapsUrl,
              websiteUrl: details.websiteUrl ?? undefined,
            };
          }
        }
        return {
          name: loc.name,
          address: loc.address,
          mapsUrl: loc.mapsUrl,
        };
      })
    );

    // Compute voting deadline if provided
    let votingDeadline: string | null = null;
    if (votingDeadlineTime) {
      votingDeadline = easternToUtc(eventInput.date, votingDeadlineTime);
    }

    const snapshot = await createEvent({ ...eventInput, goLiveAt, delayStartAt, delayEndAt, votingDeadline }, resolvedLocations, group.id);
    // Any go-live time / deadline on this event must reach the cron's cached pending list.
    if (goLiveAt || votingDeadline) invalidatePendingInstants();

    after(() =>
      notifyOwner(
        `[ilikelunch] New meal scheduled: ${group.name}`,
        `${group.name} scheduled a new meal.\n\nTitle: ${eventInput.title}\nDate: ${eventInput.date}\nGoes live: ${goLiveAt ? new Date(goLiveAt).toLocaleString("en-US", { timeZone: EASTERN_TZ }) : "immediately"}\nURL: https://ilikelunch.com/g/${groupSlug}`
      )
    );

    // Send push immediately only for non-delayed events
    // Delayed events get their push when they go live (cron)
    if (!goLiveAt) {
      after(async () => {
        await sendPushToGroup(group.id, {
          title: "Lunch is on!",
          body: "Vote now.",
          url: `/g/${groupSlug}`,
          tag: `event-${snapshot?.event?.id}`,
        });
      });
    }

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
