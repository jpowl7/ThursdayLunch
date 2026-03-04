import { NextRequest, NextResponse } from "next/server";
import { PushSubscribeSchema, PushUnsubscribeSchema } from "@/lib/schemas";
import { upsertPushSubscription, deletePushSubscription, getGroupBySlug } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PushSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { participantKey, groupSlug, subscription } = parsed.data;
    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await upsertPushSubscription(
      participantKey,
      group.id,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PushUnsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { participantKey, groupSlug, endpoint } = parsed.data;
    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await deletePushSubscription(participantKey, group.id, endpoint);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
