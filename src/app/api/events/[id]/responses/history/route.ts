import { NextRequest, NextResponse } from "next/server";
import { checkGroupAdmin } from "@/lib/auth";
import { getGroupByEventId, getResponseHistory } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await getGroupByEventId(id);
    if (!group) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const denied = await checkGroupAdmin(request, group);
    if (denied) return denied;

    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "name query param required" }, { status: 400 });
    }

    const history = await getResponseHistory(id, name);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching response history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
