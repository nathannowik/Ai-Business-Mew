import { env } from "../env.js";

/**
 * Transcribe an audio recording. Uses OpenAI Whisper (Claude has no audio API).
 * Throws a clear error when no provider key is configured so callers can tell
 * the user to paste a transcript instead.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  if (!env.transcription.enabled) {
    throw new Error(
      "Transcription is not configured. Add OPENAI_API_KEY, or paste the transcript instead.",
    );
  }

  const form = new FormData();
  form.append("file", new Blob([buffer]), filename || "recording.mp3");
  form.append("model", env.transcription.model);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.transcription.openaiApiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
