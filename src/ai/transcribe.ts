/**
 * Transcripción de notas de voz.
 *
 * Claude no transcribe audio directamente, así que esta pieza usa un
 * proveedor de voz-a-texto aparte. Por defecto usa la API de transcripción
 * de OpenAI (Whisper) porque es el estándar más simple y barato de integrar;
 * si prefieres otro proveedor (Google Speech-to-Text, Deepgram, etc.) solo
 * hay que reemplazar el contenido de esta función.
 *
 * Requiere la variable de entorno OPENAI_API_KEY (independiente de
 * ANTHROPIC_API_KEY). Si no está configurada, se avisa claramente en vez
 * de fallar en silencio.
 */

export async function transcribirAudio(audio: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY no está configurada. Es necesaria para transcribir notas de voz (ver src/ai/transcribe.ts)."
    );
  }

  const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp3") ? "mp3" : "m4a";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `audio.${extension}`);
  form.append("model", "whisper-1");
  form.append("language", "es");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error transcribiendo audio: ${res.status} ${detalle}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text.trim();
}
