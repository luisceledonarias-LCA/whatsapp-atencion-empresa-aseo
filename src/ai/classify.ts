import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import Anthropic from "@anthropic-ai/sdk";
import { claude, MODELO } from "./claude.js";
import { BASE_DE_CONOCIMIENTO } from "./knowledgeBase.js";
import type { ClasificacionMensaje, MensajeEntrante } from "../types.js";

const ClasificacionSchema = z.object({
  categoria: z
    .enum(["urgente", "importante", "normal"])
    .describe(
      "urgente: accidente, riesgo, conflicto grave con cliente en el momento, algo que requiere acción inmediata. " +
        "importante: requiere que la supervisora lo revise pero no es una emergencia (permisos, cambios de turno, problemas moderados). " +
        "normal: consultas rutinarias o evidencia de trabajo que no requieren acción humana inmediata."
    ),
  tipo_contenido: z
    .enum(["procedimiento", "horario_o_personal", "evidencia_foto", "urgencia", "otro"])
    .describe(
      "procedimiento: pregunta sobre cómo hacer una tarea, respondible con la base de conocimiento. " +
        "horario_o_personal: turnos, horarios, permisos, licencias, temas personales de la trabajadora. " +
        "evidencia_foto: foto de un aseo realizado. " +
        "urgencia: accidente, emergencia, problema grave en terreno. " +
        "otro: cualquier cosa que no calce con las anteriores."
    ),
  respuesta_automatica: z
    .string()
    .nullable()
    .describe(
      "Texto a responder directo a la trabajadora, en tono cordial y breve. " +
        "SOLO se debe llenar si tipo_contenido es 'procedimiento' (usando la base de conocimiento) " +
        "o 'evidencia_foto' (solo confirmar recepción, agradecer). " +
        "Para 'horario_o_personal' y 'urgencia' debe ser null (SIEMPRE responde la supervisora, nunca el bot). " +
        "Para 'otro' usar null salvo que sea un saludo simple."
    ),
  escalar_a_supervisora: z
    .boolean()
    .describe(
      "true si la supervisora debe enterarse de este mensaje (horario_o_personal, urgencia, u otro ambiguo). " +
        "false si es procedimiento resuelto por el bot o evidencia_foto sin nada anómalo."
    ),
  resumen_para_supervisora: z
    .string()
    .nullable()
    .describe("Resumen de una línea para la supervisora. Solo si escalar_a_supervisora es true, si no, null."),
});

const SYSTEM_PROMPT = `
Eres el asistente de mensajería interna de una supervisora de una empresa de aseo.
Quien te escribe siempre es una trabajadora del equipo de aseo, nunca un cliente externo.

Tu trabajo es clasificar cada mensaje entrante y decidir si el bot puede responder
directamente o si debe escalarse a la supervisora, según estas reglas estrictas:

1. Si es una pregunta sobre procedimientos de trabajo que se puede responder con la
   siguiente base de conocimiento, respóndela tú directo (tipo_contenido=procedimiento,
   escalar_a_supervisora=false).
2. Si es sobre horarios, turnos, permisos o temas personales de la trabajadora, el bot
   NUNCA responde el contenido: solo se escala a la supervisora
   (tipo_contenido=horario_o_personal, escalar_a_supervisora=true, respuesta_automatica=null).
3. Si es una foto de un aseo realizado, confirma recepción de forma breve y cordial
   (tipo_contenido=evidencia_foto, escalar_a_supervisora=false), salvo que el mensaje
   indique explícitamente un problema grave junto con la foto.
4. Si es una urgencia real (accidente, emergencia, conflicto grave con un cliente en el
   momento), clasifícalo como urgente y escala inmediatamente
   (tipo_contenido=urgencia, categoria=urgente, escalar_a_supervisora=true,
   respuesta_automatica=null).
5. Cualquier otra cosa que no calce claramente: escala a la supervisora como importante
   (tipo_contenido=otro, escalar_a_supervisora=true), salvo que sea solo un saludo, en
   cuyo caso puedes responder tú un saludo breve.

Base de conocimiento de procedimientos de la empresa:
"""
${BASE_DE_CONOCIMIENTO}
"""

Responde siempre con un tono cordial, cercano y breve, como corresponde a un equipo de trabajo.
`.trim();

export async function clasificarMensaje(
  mensaje: MensajeEntrante,
  imagen?: { buffer: Buffer; mimeType: string }
): Promise<ClasificacionMensaje> {
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  if (imagen) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imagen.mimeType as "image/jpeg" | "image/png" | "image/webp",
        data: imagen.buffer.toString("base64"),
      },
    });
  }

  content.push({
    type: "text",
    text:
      mensaje.texto && mensaje.texto.length > 0
        ? mensaje.texto
        : imagen
          ? "(La trabajadora envió esta imagen sin texto adicional)"
          : "(Mensaje vacío)",
  });

  const response = await claude.messages.parse({
    model: MODELO,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: {
      format: zodOutputFormat(ClasificacionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude no devolvió una clasificación válida para este mensaje.");
  }

  return response.parsed_output;
}
