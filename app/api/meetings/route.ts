import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { Meeting } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/meetings
 * Returns: list of stored meetings (newest first)
 */
export async function GET() {
  try {
    const db = await getDb();
    const meetings = await db
      .collection<Meeting>("meetings")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      meetings.map((m) => ({ ...m, _id: m._id?.toString() }))
    );
  } catch (err: any) {
    console.error("[GET /api/meetings] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings
 * Body: { title, transcript, summary, durationSeconds? }
 * Saves a meeting record to MongoDB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, transcript, summary, durationSeconds } = body;

    if (!transcript || !summary) {
      return NextResponse.json(
        { error: "Missing transcript or summary" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const doc: Meeting = {
      title: title || "Untitled meeting",
      transcript,
      summary,
      durationSeconds,
      createdAt: new Date(),
    };

    const result = await db.collection<Meeting>("meetings").insertOne(doc);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...doc,
    });
  } catch (err: any) {
    console.error("[POST /api/meetings] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save meeting" },
      { status: 500 }
    );
  }
}
