import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Meeting } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/meetings/:id  → single meeting
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const meeting = await db
      .collection<Meeting>("meetings")
      .findOne({ _id: new ObjectId(params.id) as any });

    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ...meeting, _id: meeting._id?.toString() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Fetch failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/:id
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    await db
      .collection<Meeting>("meetings")
      .deleteOne({ _id: new ObjectId(params.id) as any });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Delete failed" },
      { status: 500 }
    );
  }
}
