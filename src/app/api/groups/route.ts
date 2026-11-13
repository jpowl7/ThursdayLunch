import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { after } from "next/server";
import { createGroup, getGroupBySlug, listGroups } from "@/lib/db/queries";
import { notifyOwner } from "@/lib/owner-email";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { hashCredential } from "@/lib/credentials";
import { CreateGroupSchema } from "@/lib/schemas/group";

export async function GET() {
  try {
    const groups = await listGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error listing groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const existing = await getGroupBySlug(parsed.data.slug);
    if (existing) {
      return NextResponse.json({ error: "A group with that URL already exists" }, { status: 409 });
    }

    const { slug, name, passcode, adminEmail } = parsed.data;
    const group = await createGroup(slug, name, await hashCredential(passcode), adminEmail);

    after(async () => {
      if (adminEmail) {
        const mail = welcomeEmail(group);
        await sendEmail(adminEmail, mail.subject, mail.text);
      }
      await notifyOwner(
        `[ilikelunch] New group: ${group.name}`,
        `A new group was just created.\n\nName: ${group.name}\nSlug: ${group.slug}\nRecovery email: ${adminEmail ? "yes" : "none"}\nURL: https://ilikelunch.com/g/${group.slug}`
      );
    });

    return NextResponse.json({ slug: group.slug, name: group.name }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
