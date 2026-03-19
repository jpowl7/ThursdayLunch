import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { CreateEventSchema } from "@/lib/schemas";
import { createEvent, getGroupBySlug } from "@/lib/db/queries";
import { getPlaceDetails } from "@/lib/google-places";
import { sendPushToGroup } from "@/lib/push";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { locations, groupSlug, delayWindow, delayStartTime, delayStartDate, ...eventInput } = parsed.data;

    // Compute random go-live time if delay requested
    let goLiveAt: string | null = null;
    let delayStartAt: string | null = null;
    let delayEndAt: string | null = null;
    let headsUpAt: string | null = null;
    if (delayWindow && delayWindow !== "none") {
      const windowMs = parseInt(delayWindow) * 60 * 1000;
      const delayMs = Math.floor(Math.random() * windowMs);

      // Use delayStartDate + delayStartTime as base if provided, otherwise now
      // Parse in US Eastern time (Granger, IN) since the time picker is local to the user
      let baseMs = Date.now();
      if (delayStartTime) {
        const dateStr = delayStartDate || new Date().toLocaleDateString("en-CA", { timeZone: "America/Indiana/Indianapolis" });
        const utcGuess = new Date(`${dateStr}T${delayStartTime}:00Z`);
        const inEastern = new Date(utcGuess.toLocaleString("en-US", { timeZone: "America/Indiana/Indianapolis" }));
        const offsetMs = inEastern.getTime() - utcGuess.getTime();
        const startDate = new Date(utcGuess.getTime() - offsetMs);
        if (!isNaN(startDate.getTime()) && startDate.getTime() > Date.now()) {
          baseMs = startDate.getTime();
        }
        // If computed time is in the past, fall back to Date.now()
      }
      goLiveAt = new Date(baseMs + delayMs).toISOString();
      delayStartAt = new Date(baseMs).toISOString();
      delayEndAt = new Date(baseMs + windowMs).toISOString();
      headsUpAt = new Date(baseMs - 5 * 60 * 1000).toISOString(); // 5 min before window start
    }

    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    if (group.passcode !== "" && group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve place details for locations with placeId
    const resolvedLocations = await Promise.all(
      locations.map(async (loc) => {
        if (loc.placeId) {
          const details = await getPlaceDetails(loc.placeId);
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

    const snapshot = await createEvent({ ...eventInput, goLiveAt, delayStartAt, delayEndAt, headsUpAt }, resolvedLocations, group.id);

    // Send push immediately only for non-delayed events
    // Delayed events get a heads-up notification via polling (5 min before window)
    if (!goLiveAt) {
      after(async () => {
        await sendPushToGroup(group.id, {
          title: "Thursday lunch is on!",
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
