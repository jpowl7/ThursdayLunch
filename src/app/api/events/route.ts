import { NextRequest, NextResponse } from "next/server";
import { CreateEventSchema } from "@/lib/schemas";
import { createEvent } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { locations, isDev, ...eventInput } = parsed.data;

    // Dev sandbox doesn't require auth; prod does
    if (!isDev) {
      const token = request.headers.get("authorization")?.replace("Bearer ", "");
      if (token !== process.env.ADMIN_TOKEN) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const snapshot = await createEvent(eventInput, locations, isDev ?? false);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
