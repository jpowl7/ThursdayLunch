import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGroupBySlug, updateGroupPasscode } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const group = await getGroupBySlug(slug);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ slug: group.slug, name: group.name });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const ChangePasscodeSchema = z.object({
  newPasscode: z.string().regex(/^\d{4}$/, "Passcode must be exactly 4 digits"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const passcode = request.headers.get("authorization")?.replace("Bearer ", "");
    const group = await getGroupBySlug(slug);
    if (!group || group.passcode !== passcode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChangePasscodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    await updateGroupPasscode(group.id, parsed.data.newPasscode);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating group passcode:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
