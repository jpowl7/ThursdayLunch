import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { readJsonBody } from "@/lib/api-body";
import { checkGroupAdmin } from "@/lib/auth";
import { getGroupBySlug, setGroupAdminEmail } from "@/lib/db/queries";
import { SetAdminEmailSchema } from "@/lib/schemas/group";
import { maskEmail, sendEmail } from "@/lib/email";
import { recoveryEmailChangedEmail } from "@/lib/email-templates";

/** Admin-only: the masked recovery address, for the settings card. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const group = await getGroupBySlug(slug);
    if (!group || group.passcode === "") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

    return NextResponse.json({ adminEmail: group.adminEmail ? maskEmail(group.adminEmail) : null });
  } catch (error) {
    console.error("Error reading recovery email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Admin-only: set or clear the recovery address. Both old and new addresses are told. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const group = await getGroupBySlug(slug);
    if (!group || group.passcode === "") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

    const body = await readJsonBody(request);
    const parsed = SetAdminEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || parsed.error.message }, { status: 400 });
    }

    const oldEmail = group.adminEmail;
    const newEmail = parsed.data.adminEmail;
    if (oldEmail !== newEmail) {
      await setGroupAdminEmail(group.id, newEmail);
      after(async () => {
        const mail = recoveryEmailChangedEmail(group, { oldEmail, newEmail });
        const recipients = [oldEmail, newEmail].filter((e): e is string => !!e);
        for (const to of recipients) await sendEmail(to, mail.subject, mail.text);
      });
    }

    return NextResponse.json({ adminEmail: newEmail ? maskEmail(newEmail) : null });
  } catch (error) {
    console.error("Error updating recovery email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
