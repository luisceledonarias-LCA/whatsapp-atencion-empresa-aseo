import { config } from "../config.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function credenciales(): { token: string; phoneNumberId: string } {
  const { token, phoneNumberId } = config.whatsapp;
  if (!token || !phoneNumberId) {
    throw new Error(
      "Faltan WHATSAPP_TOKEN y/o WHATSAPP_PHONE_NUMBER_ID en tu .env. Configúralos para poder enviar mensajes por WhatsApp."
    );
  }
  return { token, phoneNumberId };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Envía un mensaje de texto simple a un número de WhatsApp. */
export async function enviarTexto(numeroDestino: string, texto: string): Promise<void> {
  const { token, phoneNumberId } = credenciales();
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
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
  const { token, phoneNumberId } = credenciales();
  await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: mensajeId,
    }),
  });
}

/** Obtiene la URL temporal de descarga de un archivo multimedia (audio o imagen) a partir de su mediaId. */
async function obtenerUrlMedia(mediaId: string, token: string): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener la URL del media ${mediaId}: ${res.status}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

/** Descarga el contenido binario de un archivo multimedia enviado por WhatsApp. */
export async function descargarMedia(mediaId: string): Promise<Buffer> {
  const { token } = credenciales();
  const url = await obtenerUrlMedia(mediaId, token);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo descargar el media ${mediaId}: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
