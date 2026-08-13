import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { assertSpendCap, SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

// Pronunciation for the phrase cards, spoken by ElevenLabs.
//
// This is a server proxy on purpose: the ElevenLabs key bills per character,
// so it must never reach the browser bundle. The route is rate limited by the
// same guard as every other paid upstream, and responses are cacheable so the
// same phrase is only ever synthesised once.

const schema = z.object({
  // Six short phrases per pack — a low cap keeps a runaway loop cheap.
  text: z.string().min(1).max(300),
  // ISO-639. Naming the language matters: a bare "Hej" is otherwise detected
  // as English and read aloud with an English accent. Three letters allowed
  // because some languages in the phrase packs (Filipino) have no two-letter
  // code; if the provider rejects it we fall back to auto-detection below.
  language: z.string().regex(/^[a-z]{2,3}$/).optional(),
  voiceId: z.string().regex(/^[A-Za-z0-9]{16,32}$/).optional(),
});

// Turbo v2.5 accepts an explicit language_code; multilingual_v2 only guesses
// from the text, which is unreliable for two-word phrases. If a language is
// not supported by turbo we retry on multilingual and let it infer.
const MODEL = "eleven_turbo_v2_5";
const FALLBACK_MODEL = "eleven_multilingual_v2";
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George — warm, clear across languages

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 1_024 });
  if (!g.ok) return g.response;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Speech is not configured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid speech request" }, { status: 400 });
  }

  const voice = parsed.data.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE;

  const speak = (model: string, language?: string) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: model,
        ...(language ? { language_code: language } : {}),
        // Slightly slowed: these are phrases someone is trying to repeat.
        voice_settings: { stability: 0.45, similarity_boost: 0.75, speed: 0.9 },
      }),
    });

  try {
    // ElevenLabs bills per character; the fallback retry below stays within the
    // one slot this claims.
    await assertSpendCap("elevenlabs");

    let res = await speak(MODEL, parsed.data.language);

    if (!res.ok && parsed.data.language) {
      // Most likely an unsupported language for turbo — let the multilingual
      // model infer it rather than failing the request outright.
      res = await speak(FALLBACK_MODEL);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("elevenlabs error", res.status, detail.slice(0, 200));
      return failure("Could not generate speech");
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        // A phrase's audio never changes, so let the browser keep it.
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("tts", err);
    return failure("Could not generate speech");
  }
}
