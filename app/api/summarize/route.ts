import { NextRequest, NextResponse } from "next/server";
import { groq, LLM_MODEL } from "@/lib/groq";
import type { MeetingSummary } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert meeting analyst. You read meeting transcripts and produce concise, structured summaries.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "summary": "2-4 sentence overview of what the meeting was about",
  "key_points": ["important discussion point 1", "..."],
  "decisions": ["decision made during the meeting", "..."],
  "action_items": [
    { "owner": "person name or null", "task": "what needs to be done", "due": "date string or null" }
  ]
}

Rules:
- Return ONLY the JSON, no markdown fences, no commentary.
- If you cannot identify any items for a field, return an empty array [].
- Owner should be null if not clearly mentioned.
- Due dates should be left as strings exactly as mentioned (e.g. "Friday", "next week", "Oct 15").`;

/**
 * POST /api/summarize
 * Body: { transcript: string }
 * Returns: MeetingSummary
 */
export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Missing 'transcript' string in request body" },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: LLM_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Summarize this meeting transcript:\n\n${transcript}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed: MeetingSummary = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[/api/summarize] error:", err);
    return NextResponse.json(
      { error: err?.message || "Summarization failed" },
      { status: 500 }
    );
  }
}
