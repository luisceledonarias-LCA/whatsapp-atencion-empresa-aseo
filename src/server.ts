import express from "express";
import { config } from "./config.js";
import { parsearWebhook } from "./whatsapp/webhookParser.js";
import { descargarMedia, enviarTexto, marcarComoLeido } from "./whatsapp/client.js";
import { transcribirAudio } from "./ai/transcribe.js";
import { clasificarMensaje } from "./ai/classify.js";
import { guardarFoto, registrarMensaje } from "./store/memoryStore.js";
import type { MensajeEntrante } from "./types.js";

const app = express();
app.use(express.json());

/** Verificación del webhook (Meta hace un GET una sola vez al configurarlo). */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/** Recepción de mensajes. */
app.post("/webhook", async (req, res) => {
  // Responder rápido a Meta; el procesamiento sigue en segundo plano.
  res.sendStatus(200);

  const mensajesCrudos = parsearWebhook(req.body);

  for (const crudo of mensajesCrudos) {
    try {
      await marcarComoLeido(crudo.id);

      let imagenBuffer: Buffer | undefined;
      let textoFinal = crudo.texto;

      if (crudo.tipo === "audio" && crudo.mediaId && crudo.mimeType) {
        const audio = await descargarMedia(crudo.mediaId);
        textoFinal = await transcribirAudio(audio, crudo.mimeType);
      } else if (crudo.tipo === "image" && crudo.mediaId && crudo.mimeType) {
        imagenBuffer = await descargarMedia(crudo.mediaId);
      }

      const mensaje: MensajeEntrante = {
        id: crudo.id,
        de: crudo.de,
        nombrePerfil: crudo.nombrePerfil,
        tipo: crudo.tipo === "text" ? "texto" : crudo.tipo === "audio" ? "audio" : crudo.tipo === "image" ? "imagen" : "otro",
        texto: textoFinal,
        media: imagenBuffer && crudo.mimeType ? { mediaId: crudo.mediaId!, mimeType: crudo.mimeType } : undefined,
        timestamp: crudo.timestamp,
      };

      await procesarMensaje(mensaje, imagenBuffer);
    } catch (err) {
      console.error("Error procesando mensaje entrante:", err);
    }
  }
});

async function procesarMensaje(mensaje: MensajeEntrante, imagenBuffer?: Buffer): Promise<void> {
  const clasificacion = await clasificarMensaje(
    mensaje,
    imagenBuffer && mensaje.media ? { buffer: imagenBuffer, mimeType: mensaje.media.mimeType } : undefined
  );

  let fotoArchivo: string | undefined;
  if (imagenBuffer && mensaje.media) {
    fotoArchivo = guardarFoto(imagenBuffer, mensaje.de, mensaje.media.mimeType);
  }

  registrarMensaje({
    timestamp: mensaje.timestamp,
    de: mensaje.de,
    nombrePerfil: mensaje.nombrePerfil,
    tipo: mensaje.tipo,
    texto: mensaje.texto,
    categoria: clasificacion.categoria,
    tipoContenido: clasificacion.tipo_contenido,
    escalado: clasificacion.escalar_a_supervisora,
    fotoArchivo,
  });

  if (clasificacion.respuesta_automatica) {
    await enviarTexto(mensaje.de, clasificacion.respuesta_automatica);
  }

  if (clasificacion.escalar_a_supervisora) {
    const prioridad = clasificacion.categoria.toUpperCase();
    const quien = mensaje.nombrePerfil ?? mensaje.de;
    const cuerpo = clasificacion.resumen_para_supervisora ?? mensaje.texto ?? "(sin texto)";
    await enviarTexto(
      config.supervisoraNumber,
      `[${prioridad}] ${quien}:\n${cuerpo}`
    );
  }
}

app.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
});
