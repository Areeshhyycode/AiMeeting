"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

/**
 * Lazily load ffmpeg.wasm into the browser. Only loads once per page session.
 */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Extract a small mono 16kHz MP3 from any video/audio file.
 * Whisper was trained on 16kHz audio so we downsample to that for efficiency.
 *
 * Result is small enough (~28 MB / hour) to fit Groq's 25 MB upload limit
 * for short-to-medium meetings.
 */
export async function extractAudio(
  inputFile: File,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(progress));
  }

  // Pick an input filename based on the original extension so ffmpeg
  // recognizes the container format.
  const ext = inputFile.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.mp3";

  await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

  await ffmpeg.exec([
    "-i", inputName,
    "-vn",            // drop video
    "-ac", "1",       // mono
    "-ar", "16000",   // 16 kHz sample rate (Whisper standard)
    "-b:a", "64k",    // 64 kbps bitrate (good for speech)
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  // Cleanup ffmpeg's virtual filesystem
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new File([data as Uint8Array], "audio.mp3", { type: "audio/mpeg" });
}
