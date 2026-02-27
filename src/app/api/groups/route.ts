import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGroup, getGroupBySlug, listGroups } from "@/lib/db/queries";

export async function GET() {
  try {
    const groups = await listGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error listing groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const CreateGroupSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  passcode: z.string().regex(/^\d{4}$/, "Passcode must be exactly 4 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const existing = await getGroupBySlug(parsed.data.slug);
    if (existing) {
      return NextResponse.json({ error: "A group with that URL already exists" }, { status: 409 });
    }

    const group = await createGroup(parsed.data.slug, parsed.data.name, parsed.data.passcode);
    return NextResponse.json({ slug: group.slug, name: group.name }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
