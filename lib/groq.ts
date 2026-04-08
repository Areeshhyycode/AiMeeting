import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set in environment variables");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Models we use
export const WHISPER_MODEL = "whisper-large-v3";
export const LLM_MODEL = "llama-3.3-70b-versatile";
