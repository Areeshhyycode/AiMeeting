"use client";

import { useEffect, useState } from "react";
import { extractAudio } from "@/lib/extractAudio";
import type { MeetingSummary, Meeting } from "@/types";

type Stage = "idle" | "extracting" | "transcribing" | "summarizing" | "saving" | "done" | "error";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Meeting[]>([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch("/api/meetings");
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      // ignore — DB might not be reachable
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSummary(null);
    setTranscript("");
    setFileName(file.name);

    try {
      // 1. Extract audio in browser using ffmpeg.wasm
      setStage("extracting");
      setStatusMessage("Loading ffmpeg and extracting audio from video...");
      const audioFile = await extractAudio(file, (ratio) => {
        setProgress(Math.round(ratio * 100));
      });

      // 2. Transcribe via Groq Whisper
      setStage("transcribing");
      setStatusMessage("Sending audio to Groq Whisper for transcription...");
      setProgress(0);

      const fd = new FormData();
      fd.append("audio", audioFile);
      const trRes = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      });
      if (!trRes.ok) throw new Error((await trRes.json()).error || "Transcription failed");
      const trData = await trRes.json();
      setTranscript(trData.text);

      // 3. Summarize via Groq Llama
      setStage("summarizing");
      setStatusMessage("Generating summary and action items with Llama 3.3...");

      const sumRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trData.text }),
      });
      if (!sumRes.ok) throw new Error((await sumRes.json()).error || "Summarization failed");
      const summaryData: MeetingSummary = await sumRes.json();
      setSummary(summaryData);

      // 4. Save to MongoDB
      setStage("saving");
      setStatusMessage("Saving meeting to database...");

      await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          transcript: trData.text,
          summary: summaryData,
          durationSeconds: trData.duration,
        }),
      });

      setStage("done");
      setStatusMessage("Done!");
      loadHistory();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong");
      setStage("error");
    }
  }

  return (
    <div className="container">
      <h1>AI Meeting Summarizer</h1>
      <p className="subtitle">
        Upload a Zoom / Google Meet recording — get a summary and action items in seconds.
      </p>

      <label className="uploader">
        <div style={{ fontSize: 48 }}>🎙️</div>
        <p style={{ marginTop: 12, color: "#8b949e" }}>
          Click to choose a video or audio file
        </p>
        <p style={{ fontSize: 12, color: "#6e7681", marginTop: 4 }}>
          MP4, WebM, MP3, WAV, M4A — processed locally before upload
        </p>
        <button className="upload-btn" type="button">
          Choose file
        </button>
        <input
          type="file"
          accept="video/*,audio/*"
          onChange={handleFile}
          disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
        />
      </label>

      {fileName && stage !== "idle" && (
        <div className={`status ${stage === "error" ? "error" : ""}`}>
          <strong>{fileName}</strong>
          <div style={{ marginTop: 6 }}>
            {error ? `❌ ${error}` : `${stageEmoji(stage)} ${statusMessage}`}
            {progress > 0 && stage === "extracting" && ` (${progress}%)`}
          </div>
        </div>
      )}

      {summary && (
        <div className="card">
          <h2>📋 Summary</h2>
          <p>{summary.summary}</p>

          {summary.key_points?.length > 0 && (
            <>
              <h3>Key Points</h3>
              <ul>
                {summary.key_points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}

          {summary.decisions?.length > 0 && (
            <>
              <h3>Decisions</h3>
              <ul>
                {summary.decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {summary.action_items?.length > 0 && (
            <>
              <h3>Action Items</h3>
              <ul>
                {summary.action_items.map((a, i) => (
                  <li key={i} className="action-item">
                    <span>✓ {a.task}</span>
                    <span className="meta">
                      {a.owner ? `👤 ${a.owner}` : "Unassigned"}
                      {a.due ? ` · 📅 ${a.due}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {transcript && (
        <div className="card">
          <h2>📝 Transcript</h2>
          <div className="transcript">{transcript}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="history">
          <h2>Recent meetings</h2>
          {history.map((m) => (
            <div key={m._id} className="history-item">
              <div className="title">{m.title}</div>
              <div className="date">
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function stageEmoji(stage: Stage): string {
  switch (stage) {
    case "extracting": return "🎵";
    case "transcribing": return "🎤";
    case "summarizing": return "🧠";
    case "saving": return "💾";
    case "done": return "✅";
    case "error": return "❌";
    default: return "⏳";
  }
}
