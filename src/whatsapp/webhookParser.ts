/**
 * Parsea el payload crudo que Meta envía al webhook y lo convierte en una
 * lista de mensajes "en bruto" (sin transcribir audio todavía).
 * Referencia del formato: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

export interface MensajeCrudo {
  id: string;
  de: string;
  nombrePerfil?: string;
  timestamp: number;
  tipo: "text" | "audio" | "image" | "other";
  texto?: string;
  mediaId?: string;
  mimeType?: string;
}

export function parsearWebhook(body: unknown): MensajeCrudo[] {
  const mensajes: MensajeCrudo[] = [];

  const entries = (body as any)?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value;
      if (!value?.messages) continue;

      const contactos: Record<string, string> = {};
      for (const c of value.contacts ?? []) {
        if (c?.wa_id) contactos[c.wa_id] = c?.profile?.name;
      }

      for (const msg of value.messages) {
        const base = {
          id: msg.id as string,
          de: msg.from as string,
          nombrePerfil: contactos[msg.from],
          timestamp: Number(msg.timestamp) * 1000,
        };

        if (msg.type === "text") {
          mensajes.push({ ...base, tipo: "text", texto: msg.text?.body });
        } else if (msg.type === "audio") {
          mensajes.push({ ...base, tipo: "audio", mediaId: msg.audio?.id, mimeType: msg.audio?.mime_type });
        } else if (msg.type === "image") {
          mensajes.push({
            ...base,
            tipo: "image",
            mediaId: msg.image?.id,
            mimeType: msg.image?.mime_type,
            texto: msg.image?.caption,
          });
        } else {
          mensajes.push({ ...base, tipo: "other" });
        }
      }
    }
  }

  return mensajes;
}
