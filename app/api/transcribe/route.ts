import { NextRequest, NextResponse } from "next/server";
import { groq, WHISPER_MODEL } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/transcribe
 * Body: multipart/form-data with field "audio" (an audio file, ideally mp3 ≤ 25MB)
 * Returns: { text: string, duration?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided. Send as multipart field 'audio'." },
        { status: 400 }
      );
    }

    // Groq's free tier caps uploads at 25 MB
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large. Max 25 MB after extraction." },
        { status: 413 }
      );
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: WHISPER_MODEL,
      response_format: "verbose_json",
      language: "en",
    });

    return NextResponse.json({
      text: transcription.text,
      duration: (transcription as any).duration,
      segments: (transcription as any).segments,
    });
  } catch (err: any) {
    console.error("[/api/transcribe] error:", err);
    return NextResponse.json(
      { error: err?.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
