import { config } from "../config.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function authHeaders() {
  return {
    Authorization: `Bearer ${config.whatsapp.token}`,
    "Content-Type": "application/json",
  };
}

/** Envía un mensaje de texto simple a un número de WhatsApp. */
export async function enviarTexto(numeroDestino: string, texto: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/${config.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Error enviando WhatsApp a ${numeroDestino}: ${res.status} ${detalle}`);
  }
}

/** Marca un mensaje entrante como leído (aparece el doble check azul). */
export async function marcarComoLeido(mensajeId: string): Promise<void> {
  await fetch(`${GRAPH_BASE}/${config.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: mensajeId,
    }),
  });
}

/** Obtiene la URL temporal de descarga de un archivo multimedia (audio o imagen) a partir de su mediaId. */
async function obtenerUrlMedia(mediaId: string): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${config.whatsapp.token}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener la URL del media ${mediaId}: ${res.status}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** Descarga el contenido binario de un archivo multimedia enviado por WhatsApp. */
export async function descargarMedia(mediaId: string): Promise<Buffer> {
  const url = await obtenerUrlMedia(mediaId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.whatsapp.token}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar el media ${mediaId}: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
