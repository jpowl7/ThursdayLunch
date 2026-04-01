import { NextRequest, NextResponse } from "next/server";
import { getGroupBySlug, getRecurringSchedule, upsertRecurringSchedule, deleteRecurringSchedule } from "@/lib/db/queries";
import { UpsertRecurringScheduleSchema } from "@/lib/schemas";

async function authorize(request: NextRequest, slug: string) {
  const group = await getGroupBySlug(slug);
  if (!group) return { error: "Group not found", status: 404 } as const;
  const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
  if (group.passcode !== "" && group.passcode !== passcode) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { group } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await authorize(request, slug);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const schedule = await getRecurringSchedule(auth.group.id);
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error fetching recurring schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await authorize(request, slug);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = UpsertRecurringScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const schedule = await upsertRecurringSchedule(auth.group.id, parsed.data);
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error updating recurring schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await authorize(request, slug);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await deleteRecurringSchedule(auth.group.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recurring schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
